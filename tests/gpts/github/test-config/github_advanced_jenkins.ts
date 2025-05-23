import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { DeveloperHubClient } from '../../../../src/apis/backstage/developer-hub';
import { TaskIdReponse } from '../../../../src/apis/backstage/types';
import { generateRandomChars } from '../../../../src/utils/generator';
import { GitHubProvider } from "../../../../src/apis/scm-providers/github";
import { JenkinsCI } from "../../../../src/apis/ci/jenkins";
import { Kubernetes } from "../../../../src/apis/kubernetes/kube";
import { checkComponentSyncedInArgoAndRouteIsWorking, checkEnvVariablesGitHub, checkSBOMInTrustification, cleanAfterTestGitHub, createTaskCreatorOptionsGitHub, getDeveloperHubClient, getGitHubClient, getJenkinsCI, getRHTAPGitopsNamespace, getRHTAPRHDHNamespace, getRHTAPRootNamespace, setSecretsForJenkinsInFolder, setSecretsForJenkinsInFolderForTPA, parseSbomVersionFromLogs, waitForComponentCreation, getCosignPublicKey} from "../../../../src/utils/test.utils";

/**
 * 1. Components get created in Red Hat Developer Hub
 * 2. Check that components gets created successfully in Red Hat Developer Hub
 * 3. Check if Red Hat Developer Hub created GitHub repositories with Jenkinsfiles
 * 4. Commit Jenkins agent settings and enable ACS
 * 5. Creates job in Jenkins
 * 6. Trigger Jenkins Job and wait for finish 
 * 7. Perform an commit in GitHub
 * 8. Trigger Jenkins Job and wait for finish
 * 9. Check if the application is deployed in development namespace and pod is synched
 */
export const gitHubJenkinsPromotionTemplateTests = (gptTemplate: string, stringOnRoute: string) => {
    describe(`Red Hat Trusted Application Pipeline ${gptTemplate} GPT tests GitHub provider with public/private image registry`, () => {
        jest.retryTimes(3, {logErrorsBeforeRetry: true}); 

        const developmentEnvironmentName = 'development';
        const stagingEnvironmentName = 'stage';
        const productionEnvironmentName = 'prod';

        const componentRootNamespace = process.env.APPLICATION_ROOT_NAMESPACE || 'tssc-app';
        const ciNamespace = `${componentRootNamespace}-ci`;
        const developmentNamespace = `${componentRootNamespace}-${developmentEnvironmentName}`;
        const stageNamespace = `${componentRootNamespace}-${stagingEnvironmentName}`;
        const prodNamespace = `${componentRootNamespace}-${productionEnvironmentName}`;

        const githubOrganization = process.env.GITHUB_ORGANIZATION || '';
        const repositoryName = `${generateRandomChars(9)}-${gptTemplate}`;

        const imageName = "rhtap-qe-"+ `${gptTemplate}`;
        const imageOrg = process.env.IMAGE_REGISTRY_ORG || 'rhtap';
        const imageRegistry = process.env.IMAGE_REGISTRY || 'quay.io';
        
        let backstageClient: DeveloperHubClient;
        let developerHubTask: TaskIdReponse;
        let gitHubClient: GitHubProvider;
        let kubeClient: Kubernetes;
        let jenkinsClient: JenkinsCI;

        let RHTAPRootNamespace: string;
        let RHTAPGitopsNamespace: string;
        let extractedBuildImage: string;
        let gitopsPromotionPRNumber: number;

        /**
         * Initializes Github and Kubernetes client for interaction. After clients initialization will start to create a test namespace.
         * This namespace should have gitops label: 'argocd.argoproj.io/managed-by': 'openshift-gitops' to allow ArgoCD to create
         * resources
        */
        beforeAll(async () => {
            kubeClient = new Kubernetes();
            RHTAPRootNamespace = await getRHTAPRootNamespace();
            RHTAPGitopsNamespace = await getRHTAPGitopsNamespace();
            backstageClient = await getDeveloperHubClient(kubeClient);
            jenkinsClient = await getJenkinsCI(kubeClient);
            gitHubClient = await getGitHubClient(kubeClient);

            await checkEnvVariablesGitHub(componentRootNamespace, githubOrganization, imageOrg, ciNamespace, kubeClient);
        });

        /**
         * Creates a request to Developer Hub and check if the gpt really exists in the catalog
         */
        it(`verifies if ${gptTemplate} gpt exists in the catalog`, async () => {
            const goldenPathTemplates = await backstageClient.getGoldenPathTemplates();
            expect(goldenPathTemplates.some(gpt => gpt.metadata.name === gptTemplate)).toBe(true);
        });

        /**
         * Creates a task in Developer Hub to generate a new component using specified git and kube options.
         * 
         */
        it(`creates ${gptTemplate} component`, async () => {
            const taskCreatorOptions = await createTaskCreatorOptionsGitHub(gptTemplate, imageName, imageOrg, imageRegistry, githubOrganization, repositoryName, componentRootNamespace, "jenkins");

            // Creating a task in Developer Hub to scaffold the component
            developerHubTask = await backstageClient.createDeveloperHubTask(taskCreatorOptions);
        }, 120000);

        /**
         * Once test send a task to Developer Hub, test start to look for the task until all the steps are processed. Once all the steps are processed
         * test will grab logs in $ROOT_DIR/artifacts/backstage/xxxxx-component-name.log
         */
        it(`wait ${gptTemplate} component to be finished`, async () => {
            await waitForComponentCreation(backstageClient, repositoryName, developerHubTask);
        }, 120000);

        /**
         * Once a DeveloperHub task is processed should create an argocd application in openshift-gitops namespace. 
         * Need to wait until application is synced until commit something to github and trigger a pipelinerun
         */
        it(`wait ${gptTemplate} argocd to be synced in the cluster`, async () => {
            expect(await kubeClient.waitForArgoCDApplicationToBeHealthy(`${repositoryName}-development`, 500000)).toBe(true);
        }, 600000);

        /**
         * Start to verify if Red Hat Developer Hub created repository from our template in GitHub. This repository should contain the source code of 
         * my application. Also verifies if the repository contains a Jenkinsfile.
         */
        it(`verifies if component ${gptTemplate} was created in GitHub and contains Jenkinsfile`, async () => {
            expect(await gitHubClient.checkIfRepositoryExists(githubOrganization, repositoryName)).toBe(true);
            expect(await gitHubClient.checkIfFolderExistsInRepository(githubOrganization, repositoryName, 'Jenkinsfile')).toBe(true);
        }, 120000);

        /**
         * Creates commits to update Jenkins agent and enable ACS scan
         */
        it(`Commit updated agent ${gptTemplate} and enable ACS scan`, async () => {
            expect(await gitHubClient.createAgentCommit(githubOrganization, repositoryName)).not.toBe(undefined);
            expect(await gitHubClient.createAgentCommit(githubOrganization, repositoryName + "-gitops")).not.toBe(undefined);
            expect(await gitHubClient.enableACSJenkins(githubOrganization, repositoryName)).not.toBe(undefined);
            expect(await gitHubClient.enableACSJenkins(githubOrganization, repositoryName + "-gitops")).not.toBe(undefined);
            expect(await gitHubClient.deleteCosignPublicKey(githubOrganization, repositoryName + "-gitops")).not.toBe(undefined);
            expect(await gitHubClient.createRegistryPasswordCommit(githubOrganization, repositoryName)).not.toBe(undefined);
            expect(await gitHubClient.createRegistryPasswordCommit(githubOrganization, repositoryName + "-gitops")).not.toBe(undefined);
            expect(await gitHubClient.disableQuayCommit(githubOrganization, repositoryName)).not.toBe(undefined);
            expect(await gitHubClient.disableQuayCommit(githubOrganization, repositoryName + "-gitops")).not.toBe(undefined);
            expect(await gitHubClient.updateRekorHost(githubOrganization, repositoryName, await kubeClient.getRekorServerUrl(RHTAPRootNamespace))).not.toBe(undefined);
            expect(await gitHubClient.updateRekorHost(githubOrganization, repositoryName + "-gitops", await kubeClient.getRekorServerUrl(RHTAPRootNamespace))).not.toBe(undefined);
            expect(await gitHubClient.updateTUFMirror(githubOrganization, repositoryName, await kubeClient.getTUFUrl(RHTAPRootNamespace))).not.toBe(undefined);
            expect(await gitHubClient.updateTUFMirror(githubOrganization, repositoryName + "-gitops", await kubeClient.getTUFUrl(RHTAPRootNamespace))).not.toBe(undefined);
            expect(await gitHubClient.updateRoxCentralEndpoint(githubOrganization, repositoryName, await kubeClient.getACSEndpoint(await getRHTAPRootNamespace()))).not.toBe(undefined);
            expect(await gitHubClient.updateRoxCentralEndpoint(githubOrganization, repositoryName + "-gitops", await kubeClient.getACSEndpoint(await getRHTAPRootNamespace()))).not.toBe(undefined);
            expect(await gitHubClient.updateCosignPublicKey(githubOrganization, repositoryName, await getCosignPublicKey(kubeClient))).not.toBe(undefined);
            expect(await gitHubClient.updateCosignPublicKey(githubOrganization, repositoryName + "-gitops", await getCosignPublicKey(kubeClient))).not.toBe(undefined);
            expect(await gitHubClient.updateImageRegistryUser(githubOrganization, repositoryName, process.env.IMAGE_REGISTRY_USERNAME ?? '')).not.toBe(undefined);
            expect(await gitHubClient.updateImageRegistryUser(githubOrganization, repositoryName + "-gitops", process.env.IMAGE_REGISTRY_USERNAME ?? '')).not.toBe(undefined);
        }, 120000);

        /**
         * Verification to check if Red Hat Developer Hub created the gitops repository with Jenkinsfile
         */
        it(`verifies if component ${gptTemplate} have a valid gitops repository and there exists a Jenkinsfile`, async () => {
            expect(await gitHubClient.checkIfRepositoryExists(githubOrganization, `${repositoryName}-gitops`)).toBe(true);
            expect(await gitHubClient.checkIfFolderExistsInRepository(githubOrganization, repositoryName, 'Jenkinsfile')).toBe(true);
        }, 120000);

        it(`creates ${gptTemplate} jenkins folder`, async () => {
            await jenkinsClient.createFolder(repositoryName);
        }, 120000);

        it(`Create credentials in Jenkins for ${gptTemplate} job folder`, async () => {
            await setSecretsForJenkinsInFolder(jenkinsClient, kubeClient, repositoryName, "github");
            await setSecretsForJenkinsInFolderForTPA(jenkinsClient, kubeClient, repositoryName);
        }, 120000);

        it(`creates ${gptTemplate} jenkins job and wait for creation`, async () => {
            await jenkinsClient.createJenkinsJobInFolder("github.com", githubOrganization, repositoryName, repositoryName);
            await jenkinsClient.waitForJobCreationInFolder(repositoryName, repositoryName);
            await gitHubClient.createWebhook(githubOrganization, repositoryName, await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "tssc-developer-hub-env", "JENKINS__BASEURL") + "/github-webhook/");
        }, 120000);

        it(`creates ${gptTemplate} GitOps jenkins job and wait for creation`, async () => {
            await jenkinsClient.createJenkinsJobInFolder("github.com", githubOrganization, repositoryName + "-gitops", repositoryName);
            await jenkinsClient.waitForJobCreationInFolder(repositoryName + "-gitops", repositoryName);
            await gitHubClient.createWebhook(githubOrganization, repositoryName + "-gitops", await kubeClient.getDeveloperHubSecret(await getRHTAPRHDHNamespace(), "tssc-developer-hub-env", "JENKINS__BASEURL") + "/github-webhook/");
        }, 120000);

        /**
         * Trigger and wait for Jenkins job to finish
         */
        it(`Build and wait for ${gptTemplate} jenkins job`, async () => {
            await jenkinsClient.buildJenkinsJobInFolder(repositoryName, repositoryName);
            console.log('Waiting for the build to start...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(repositoryName, 1, 540000, repositoryName);
            expect(jobStatus).not.toBe(undefined);
            expect(jobStatus).toBe("SUCCESS");
        }, 900000);

        /**
         * Creates an empty commit
         */
        it(`Creates empty commit`, async () => {
            const commit = await gitHubClient.createEmptyCommit(githubOrganization, repositoryName);
            expect(commit).not.toBe(undefined);

        }, 120000);

        /**
         * Trigger and wait for Jenkins job to finish(it will also run deployment pipeline)
         */
        it(`Trigger job and wait for ${gptTemplate} jenkins job to finish`, async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(repositoryName, 2, 540000, repositoryName);
            expect(jobStatus).not.toBe(undefined);
            expect(jobStatus).toBe("SUCCESS");
        }, 900000);

        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster and deployed in development environment
         */
        it('container component is successfully synced by gitops in development environment', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, developmentNamespace, developmentEnvironmentName, repositoryName, stringOnRoute);
        }, 900000);

        /**
         * Trigger and wait for Jenkins job to finish(it will also run deployment pipeline)
         */
        it(`Trigger job and wait for ${gptTemplate} jenkins job to finish`, async () => {
            await jenkinsClient.buildJenkinsJobInFolder(repositoryName + "-gitops", repositoryName);
            console.log('Waiting for the build to start...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(repositoryName + "-gitops", 1, 600000, repositoryName);
            expect(jobStatus).not.toBe(undefined);
            expect(jobStatus).toBe("SUCCESS");
        }, 900000);

        /**
        * Trigger a promotion Pull Request in Gitops repository to promote stage image to prod environment
        */
        it('trigger pull request promotion to promote from development to stage environment', async () => {
            const getImage = await gitHubClient.extractImageFromContent(githubOrganization, `${repositoryName}-gitops`, repositoryName, developmentEnvironmentName);

            if (getImage !== undefined) {
                extractedBuildImage = getImage;
            } else {
                throw new Error("Failed to create a pr");
            }

            const gitopsPromotionPR = await gitHubClient.promoteGitopsImageEnvironment(githubOrganization, `${repositoryName}-gitops`, repositoryName, stagingEnvironmentName, extractedBuildImage);
            if (gitopsPromotionPR !== undefined) {
                gitopsPromotionPRNumber = gitopsPromotionPR;
            } else {
                throw new Error("Failed to create a pr");
            }
        });

        /**
         * Merge the gitops Pull Request with the new image value. Expect that argocd will sync the new image in stage 
         */
        it(`merge gitops pull request to sync new image in stage environment`, async () => {
            await gitHubClient.mergePullRequest(githubOrganization, `${repositoryName}-gitops`, gitopsPromotionPRNumber);
        }, 120000);


        /**
         * Trigger and wait for Jenkins job to finish(it will also run deployment pipeline)
         */
        it(`Wait for ${gptTemplate} jenkins job to finish for promotion from development to stage`, async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(`${repositoryName}-gitops`, 2, 540000, repositoryName);
            expect(jobStatus).not.toBe(undefined);
            expect(jobStatus).toBe("SUCCESS");
        }, 900000);


        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster and deployed in staging environment
         */
        it('container component is successfully synced by gitops in staging environment', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, stageNamespace, stagingEnvironmentName, repositoryName, stringOnRoute);
        }, 900000);


        /**
        * Trigger a promotion Pull Request in Gitops repository to promote stage image to prod environment
        */
        it('trigger pull request promotion to promote from stage to production environment', async () => {
            const getImage = await gitHubClient.extractImageFromContent(githubOrganization, `${repositoryName}-gitops`, repositoryName, stagingEnvironmentName);

            if (getImage !== undefined) {
                extractedBuildImage = getImage;
            } else {
                throw new Error("Failed to create a pr");
            }

            const gitopsPromotionPR = await gitHubClient.promoteGitopsImageEnvironment(githubOrganization, `${repositoryName}-gitops`, repositoryName, productionEnvironmentName, extractedBuildImage);
            if (gitopsPromotionPR !== undefined) {
                gitopsPromotionPRNumber = gitopsPromotionPR;
            } else {
                throw new Error("Failed to create a pr");
            }
        });

        /**
         * Merge the gitops Pull Request with the new image value. Expect that argocd will sync the new image in stage 
         */
        it(`merge gitops pull request to sync new image in production environment`, async () => {
            await gitHubClient.mergePullRequest(githubOrganization, `${repositoryName}-gitops`, gitopsPromotionPRNumber);
        }, 120000);

        /**
        * Trigger and wait for Jenkins job to finish(it will also run deployment pipeline)
        */
        it(`Trigger job and wait for ${gptTemplate} jenkins job to finish promotion pipeline for production environment`, async () => {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const jobStatus = await jenkinsClient.waitForJobToFinishInFolder(repositoryName + "-gitops", 3, 540000, repositoryName);
            expect(jobStatus).not.toBe(undefined);
            expect(jobStatus).toBe("SUCCESS");
        }, 900000);

        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster and deployed in prod environment
         */
        it('container component is successfully synced by gitops in prod environment', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, prodNamespace, productionEnvironmentName, repositoryName, stringOnRoute);
        }, 900000);

        /*
        * Verifies if the SBOm is uploaded in RHTPA/Trustification
        */
        it('check sbom uploaded in RHTPA', async () => {
            const buildLog = await jenkinsClient.getJobConsoleLogForBuild(repositoryName, repositoryName, 2);
            const sbomVersion = await parseSbomVersionFromLogs(buildLog);
            await checkSBOMInTrustification(kubeClient, sbomVersion);
        }, 900000);

        /**
        * Deletes created applications
        */
        afterAll(async () => {
            if (process.env.CLEAN_AFTER_TESTS === 'true') {
                await cleanAfterTestGitHub(gitHubClient, kubeClient, RHTAPGitopsNamespace, githubOrganization, repositoryName);
                await jenkinsClient.deleteJenkinsJobInFolder(repositoryName, repositoryName);
                await jenkinsClient.deleteJenkinsJobInFolder(repositoryName + "-gitops", repositoryName);
            }
        });
    });

};
