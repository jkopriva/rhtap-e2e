import { skipSuite } from "../../test-utils.ts";
<<<<<<< HEAD
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
=======
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts"
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)
import { gitLabProviderGitLabCIWithPromotionTests } from "./suites-config/gitlab_gitlabci_advanced.ts";

const quarkusTemplateName = 'java-quarkus';
const stringOnRoute =  'Congratulations, you have created a new Quarkus cloud application.';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

<<<<<<< HEAD
    if (configuration.templates.includes(quarkusTemplateName) && configuration.gitlab && configuration.gitlab.gitlabci) {
=======
    if (configuration.templates.includes(quarkusTemplateName) && configuration.gitlab.active && configuration.gitlab.gitlabci) {
>>>>>>> 45c51d7 (RHTAP-3358 GitLab CI promotion pipeline)
        gitLabProviderGitLabCIWithPromotionTests(quarkusTemplateName, stringOnRoute);
    } else {
        skipSuite(quarkusTemplateName);
    }
};

runQuarkusBasicTests();
