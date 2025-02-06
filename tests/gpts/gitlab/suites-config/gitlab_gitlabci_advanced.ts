import { beforeAll, expect, it, describe } from "@jest/globals";
import { DeveloperHubClient } from "../../../../src/apis/backstage/developer-hub";
import { TaskIdReponse } from "../../../../src/apis/backstage/types";
import { GitLabProvider } from "../../../../src/apis/git-providers/gitlab";
import { Kubernetes } from "../../../../src/apis/kubernetes/kube";
import { generateRandomChars } from "../../../../src/utils/generator";
import { checkComponentSyncedInArgoAndRouteIsWorking, checkEnvVariablesGitLab, cleanAfterTestGitLab, createTaskCreatorOptionsGitlab, getDeveloperHubClient, getGitLabProvider, getRHTAPRootNamespace, setSecretsForGitLabCI, waitForComponentCreation, waitForGitLabCIPipelineToFinish } from "../../../../src/utils/test.utils";

/**
 * Advanced end-to-end test scenario for Red Hat Trusted Application Pipelines:
 * 1. Create components in Red Hat Developer Hub.
 * 2. Verify successful creation of components in Red Hat Developer Hub.
 * 3. Ensure Red Hat Developer Hub creates a corresponding GitLab repository.
 * 4. Initiate a Pull Request to trigger a PipelineRun for pull_request events in the GitLab repository.
 * 5. Merge the Pull Request if the PipelineRun succeeds.
 * 6. Upon merging the Pull Request, validate that the push PipelineRun starts and finishes successfully.
 * 7. Verify that the new image is deployed correctly in the development environment.
 * 8. Trigger a Pull Request in the component gitops folder to promote the development image to the stage environment.
 * 9. Ensure that the EC Pipeline Runs are successfully passed.
 * 10. Merge the Pull Request to main.
 * 11. Wait for the new image to be deployed to the stage environment.
 * 12. Trigger a Pull Request in the component gitops repository to promote the stage image to the production environment.
 * 13. Verify that the EC Pipeline Runs are successfully passed.
 * 14. Merge the Pull Request to main.
 * 15. Wait for the new image to be deployed to the production environment.
 * 
 * @param softwareTemplateName The name of the software template.
 */
export const gitLabProviderGitLabCIWithPromotionTests = (softwareTemplateName: string, stringOnRoute: string) => {
    describe(`RHTAP ${softwareTemplateName} template test GitLab provider with GitLab CI`, () => {
        jest.retryTimes(2);

        let backstageClient: DeveloperHubClient;
        let developerHubTask: TaskIdReponse;
        let gitLabProvider: GitLabProvider;
        let kubeClient: Kubernetes;

        let gitlabRepositoryID: number;
        let gitlabRepositoryGitOpsID: number;
        let gitopsPromotionMergeRequestNumber: number;

        let RHTAPRootNamespace: string;

        const developmentEnvironmentName = 'development';
        const stagingEnvironmentName = 'stage';
        const productionEnvironmentName = 'prod';
        const componentRootNamespace = process.env.APPLICATION_ROOT_NAMESPACE || 'rhtap-app';
        const developmentNamespace = `${componentRootNamespace}-development`;
        const stageNamespace = `${componentRootNamespace}-${stagingEnvironmentName}`;
        const prodNamespace = `${componentRootNamespace}-${productionEnvironmentName}`;

        const gitLabOrganization = process.env.GITLAB_ORGANIZATION || '';
        const repositoryName = `${generateRandomChars(9)}-${softwareTemplateName}`;

<<<<<<< HEAD
        const imageName = "rhtap-qe";
        const imageOrg = process.env.QUAY_IMAGE_ORG || '';
=======
        const quayImageName = "rhtap-qe";
        const quayImageOrg = process.env.QUAY_IMAGE_ORG || '';
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)
        const imageRegistry = process.env.IMAGE_REGISTRY || 'quay.io';

        beforeAll(async () => {
            RHTAPRootNamespace = await getRHTAPRootNamespace();
            kubeClient = new Kubernetes();
            gitLabProvider = await getGitLabProvider(kubeClient);
            backstageClient = await getDeveloperHubClient(kubeClient);

<<<<<<< HEAD
            await checkEnvVariablesGitLab(componentRootNamespace, gitLabOrganization, imageOrg, developmentNamespace, kubeClient);
        });
=======
            await checkEnvVariablesGitLab(componentRootNamespace, gitLabOrganization, quayImageOrg, developmentNamespace, kubeClient);
        })
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
            * Creates a task in Developer Hub to generate a new component using specified git and kube options.
        */
        it(`creates ${softwareTemplateName} component`, async () => {
<<<<<<< HEAD
            const taskCreatorOptions = await createTaskCreatorOptionsGitlab(softwareTemplateName, imageName, imageOrg, imageRegistry, gitLabOrganization, repositoryName, componentRootNamespace, "gitlabci");
=======
            const taskCreatorOptions = await createTaskCreatorOptionsGitlab(softwareTemplateName, quayImageName, quayImageOrg, imageRegistry, gitLabOrganization, repositoryName, componentRootNamespace, "gitlabci");
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

            // Creating a task in Developer Hub to scaffold the component
            developerHubTask = await backstageClient.createDeveloperHubTask(taskCreatorOptions);
        }, 120000);

        /**
        * Waits for the ${softwareTemplateName} component creation task to be completed in Developer Hub.
        * If the task is not completed within the timeout, it writes logs to the specified directory.
        */
        it(`waits for ${softwareTemplateName} component creation to finish`, async () => {
            await waitForComponentCreation(backstageClient, repositoryName, developerHubTask);
        }, 120000);

        /**
        * Checks if Red Hat Developer Hub created the repository with all our manifests for argoCd
        */
        it(`verifies if component ${softwareTemplateName} was created in GitLab and contains '.gitlab-ci.yml' file`, async () => {
<<<<<<< HEAD
            gitlabRepositoryID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, repositoryName);
            expect(gitlabRepositoryID).toBeDefined();

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(gitlabRepositoryID, '.gitlab-ci.yml');
            expect(tektonFolderExists).toBe(true);
        }, 60000);
=======
            gitlabRepositoryID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, repositoryName)
            expect(gitlabRepositoryID).toBeDefined()

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(gitlabRepositoryID, '.gitlab-ci.yml')
            expect(tektonFolderExists).toBe(true)
        }, 60000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Checks if Red Hat Developer Hub created the gitops repository with all our manifests for argoCd
        */
        it(`verifies if gitops ${softwareTemplateName} was created in GitLab and contains '.gitlab-ci.yml' file`, async () => {
<<<<<<< HEAD
            gitlabRepositoryGitOpsID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, repositoryName + "-gitops");
            expect(gitlabRepositoryGitOpsID).toBeDefined();

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(gitlabRepositoryGitOpsID, '.gitlab-ci.yml');
            expect(tektonFolderExists).toBe(true);
        }, 60000);
=======
            gitlabRepositoryGitOpsID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, repositoryName + "-gitops")
            expect(gitlabRepositoryGitOpsID).toBeDefined()

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(gitlabRepositoryGitOpsID, '.gitlab-ci.yml')
            expect(tektonFolderExists).toBe(true)
        }, 60000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Verifies if Red Hat Developer Hub created a gitops repository from the specified template in GitLab.
        */
        it(`verifies if component ${softwareTemplateName} have a valid gitops repository and there exists a '.gitlab-ci.yml' file`, async () => {
<<<<<<< HEAD
            const repositoryID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, `${repositoryName}-gitops`);

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(repositoryID, '.gitlab-ci.yml');
            expect(tektonFolderExists).toBe(true);
        }, 60000);
=======
            const repositoryID = await gitLabProvider.checkIfRepositoryExists(gitLabOrganization, `${repositoryName}-gitops`)

            const tektonFolderExists = await gitLabProvider.checkIfRepositoryHaveFile(repositoryID, '.gitlab-ci.yml')
            expect(tektonFolderExists).toBe(true)
        }, 60000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Waits for the specified ArgoCD application associated with the DeveloperHub task to be synchronized in the cluster.
        */
        it(`wait ${softwareTemplateName} argocd to be synced in the cluster`, async () => {
            expect(await kubeClient.waitForArgoCDApplicationToBeHealthy(`${repositoryName}-development`, 500000)).toBe(true);
        }, 600000);

        /**
        * Cancel first pipeline - it fails anyway due to missing env vars
        */
        it(`Cancel first pipeline`, async () => {
            // Kill initial pipelines to save time
            await gitLabProvider.killInitialPipeline(gitlabRepositoryID);
            await gitLabProvider.killInitialPipeline(gitlabRepositoryGitOpsID);
        }, 600000);

        /**
        * Setup env cvariables for gitlab runner in repository settings.
        */
<<<<<<< HEAD
        it(`Setup creds for ${softwareTemplateName} pipeline in repositories: component and gitops`, async () => {
=======
        it(`Setup creds for ${softwareTemplateName} pipeline in repositories: componnet and gitops`, async () => {
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)
            await setSecretsForGitLabCI(gitLabProvider, gitlabRepositoryID, kubeClient);
            await setSecretsForGitLabCI(gitLabProvider, gitlabRepositoryGitOpsID, kubeClient);
        }, 600000);

        /**
         *  Update RHTAP env file in repository with correct URLs
         */
        it(`Commit updated RHTAP env file for ${softwareTemplateName} and enable ACS scan`, async () => {
            // Update env file for GitLab CI vars
            await gitLabProvider.updateEnvFileForGitLabCI(gitlabRepositoryID, 'main', await kubeClient.getRekorServerUrl(RHTAPRootNamespace), await kubeClient.getTUFUrl(RHTAPRootNamespace));
            await gitLabProvider.updateEnvFileForGitLabCI(gitlabRepositoryGitOpsID, 'main', await kubeClient.getRekorServerUrl(RHTAPRootNamespace), await kubeClient.getTUFUrl(RHTAPRootNamespace));
<<<<<<< HEAD
        }, 120000);
=======
        }, 120000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Waits for pipeline after commit RHTAP ENV
        */
        it(`Wait for a pipeline run to finish in component repo`, async () => {
            await waitForGitLabCIPipelineToFinish(gitLabProvider, gitlabRepositoryID, 2);
<<<<<<< HEAD
        }, 600000);
=======
        }, 600000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
         * Obtain the openshift Route for the component and verify that the previous builded image was synced in the cluster and deployed in development environment
         */
        it('container component is successfully synced by gitops in development environment and route is working', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, developmentNamespace, developmentEnvironmentName, repositoryName, stringOnRoute);
<<<<<<< HEAD
        }, 600000);
=======
        }, 600000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Trigger a promotion Pull Request in Gitops repository to promote development image to stage environment
        */
        it('trigger pull request promotion to promote from development to stage environment', async () => {
            gitopsPromotionMergeRequestNumber = await gitLabProvider.createMergeRequestWithPromotionImage(gitlabRepositoryGitOpsID, generateRandomChars(6),
                repositoryName, developmentEnvironmentName, stagingEnvironmentName);
<<<<<<< HEAD
            expect(gitopsPromotionMergeRequestNumber).toBeDefined();

            await waitForGitLabCIPipelineToFinish(gitLabProvider, gitlabRepositoryGitOpsID, 1);
        }, 900000);
=======
            expect(gitopsPromotionMergeRequestNumber).toBeDefined()

            await waitForGitLabCIPipelineToFinish(gitLabProvider, gitlabRepositoryGitOpsID, 1);
        }, 900000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Merge the gitops Pull Request with the new image value for stage environment. Expect that argocd will sync the new image in stage 
        */
        it(`merge gitops pull request to sync new image in stage environment`, async () => {
<<<<<<< HEAD
            await gitLabProvider.mergeMergeRequest(gitlabRepositoryGitOpsID, gitopsPromotionMergeRequestNumber);
        }, 120000);
=======
            await gitLabProvider.mergeMergeRequest(gitlabRepositoryGitOpsID, gitopsPromotionMergeRequestNumber)
        }, 120000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /*
        * Verifies if the new image is deployed with an expected endpoint in stage environment
        */
        it('container component is successfully synced by gitops in stage environment', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, stageNamespace, stagingEnvironmentName, repositoryName, stringOnRoute);
<<<<<<< HEAD
        }, 900000);
=======
        }, 900000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Trigger a promotion Pull Request in Gitops repository to promote stage image to prod environment
        */
        it('trigger pull request promotion to promote from stage to prod environment', async () => {
            gitopsPromotionMergeRequestNumber = await gitLabProvider.createMergeRequestWithPromotionImage(gitlabRepositoryGitOpsID, generateRandomChars(6),
                repositoryName, stagingEnvironmentName, productionEnvironmentName);
<<<<<<< HEAD
            expect(gitopsPromotionMergeRequestNumber).toBeDefined();

            await waitForGitLabCIPipelineToFinish(gitLabProvider, gitlabRepositoryGitOpsID, 2);
        }, 900000);
=======
            expect(gitopsPromotionMergeRequestNumber).toBeDefined()

            await waitForGitLabCIPipelineToFinish(gitLabProvider, gitlabRepositoryGitOpsID, 2);
        }, 900000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Merge the gitops Pull Request with the new image value for prod. Expect that argocd will sync the new image in stage 
        */
        it(`merge gitops pull request to sync new image in prod environment`, async () => {
<<<<<<< HEAD
            await gitLabProvider.mergeMergeRequest(gitlabRepositoryGitOpsID, gitopsPromotionMergeRequestNumber);
        }, 120000);
=======
            await gitLabProvider.mergeMergeRequest(gitlabRepositoryGitOpsID, gitopsPromotionMergeRequestNumber)
        }, 120000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /*
        * Verifies if the new image is deployed with an expected endpoint in production environment
        */
        it('container component is successfully synced by gitops in prod environment', async () => {
            await checkComponentSyncedInArgoAndRouteIsWorking(kubeClient, backstageClient, prodNamespace, productionEnvironmentName, repositoryName, stringOnRoute);
<<<<<<< HEAD
        }, 900000);
=======
        }, 900000)
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)

        /**
        * Deletes created applications
        */
        afterAll(async () => {
            if (process.env.CLEAN_AFTER_TESTS === 'true') {
<<<<<<< HEAD
                await cleanAfterTestGitLab(gitLabProvider, kubeClient, RHTAPRootNamespace, gitLabOrganization, gitlabRepositoryID, repositoryName);
            }
        });
    });
};
=======
                await cleanAfterTestGitLab(gitLabProvider, kubeClient, RHTAPRootNamespace, gitLabOrganization, gitlabRepositoryID, repositoryName)
            }
        })
    })
}
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)
