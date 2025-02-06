import { skipSuite } from "../../test-utils.ts";
import { loadSoftwareTemplatesTestsGlobals } from "../github/test-config/config.ts";
import { gitLabJenkinsAdvancedTests } from "./suites-config/gitlab_advanced_jenkins.ts";

/**
 * Tests Quarkus template in Gitlab with Jenkins
 * 
 * @group jenkins
 * @group quarkus
 * @group gitlab
 * @group basic
 */

const quarkusTemplateName = 'java-quarkus';
const stringOnRoute = 'Congratulations, you have created a new Quarkus cloud application.';

const runQuarkusBasicTests = () => {
    const configuration = loadSoftwareTemplatesTestsGlobals();

<<<<<<< HEAD
    if (configuration.templates.includes(quarkusTemplateName) && configuration.gitlab && configuration.gitlab.jenkins) {
=======
    if (configuration.templates.includes(quarkusTemplateName) && configuration.gitlab.active && configuration.gitlab.jenkins) {
>>>>>>> 2c3d200 (RHTAP-3358 Promotion pipeline for GitLab/Jenkins(+ some fixes for)
        gitLabJenkinsAdvancedTests(quarkusTemplateName, stringOnRoute);
    } else {
        skipSuite(quarkusTemplateName);
    }
};

runQuarkusBasicTests();
