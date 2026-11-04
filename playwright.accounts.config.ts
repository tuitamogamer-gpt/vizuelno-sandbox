import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:"./tests/accounts",outputDir:"account-test-results",fullyParallel:false,workers:1,timeout:90_000,expect:{timeout:15000},use:{baseURL:process.env.ACCOUNT_TEST_ORIGIN||"http://localhost:3002",viewport:{width:1440,height:1000},trace:"retain-on-failure"},reporter:"list"});
