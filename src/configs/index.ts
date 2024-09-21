import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ObjectSchema } from "joi";

import { logger } from "../libraries/log/logger";
import schema from "./config.schema";

interface ConfigData {
  [key: string]: any;
}

class Config {
  private static instance: Config;
  public readonly config: ConfigData;

  private constructor() {
    logger.info("Loading and validating config for the first time...");
    this.config = this.loadAndValidateConfig();
    logger.info("Config loaded and validated");
  }

  private loadAndValidateConfig(): ConfigData {
    const environment = process.env.NODE_ENV || "development";

    // 1. Load environment file
    const envFile = `.env.${environment}`;
    const envPath = path.join(__dirname, "..", envFile);
    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envPath}`);
    }
    dotenv.config({ path: envPath });

    // 2. Load config file based on environment
    const configFile = path.join(__dirname, `config.${environment}.json`);
    if (!fs.existsSync(configFile)) {
      throw new Error(`Config file not found: ${configFile}`);
    }
    let config: ConfigData = JSON.parse(fs.readFileSync(configFile, "utf-8"));

    // 3. Load and merge shared config
    const sharedConfigFile = path.join(__dirname, "config.shared.json");
    if (fs.existsSync(sharedConfigFile)) {
      const sharedConfig: ConfigData = JSON.parse(
        fs.readFileSync(sharedConfigFile, "utf-8")
      );
      config = { ...sharedConfig, ...config };
    }

    // 4. Merge with environment variables
    const finalConfig: ConfigData = {};
    const schemaKeys = (schema as ObjectSchema).describe().keys;
    for (const key in schemaKeys) {
      if (process.env.hasOwnProperty(key)) {
        finalConfig[key] = process.env[key]; // Prioritize environment variables
      } else if (config.hasOwnProperty(key)) {
        finalConfig[key] = config[key]; // Fallback to config file value
      }
    }

    // 5. Validate the config
    const { error, value: validatedConfig } = (schema as ObjectSchema).validate(
      finalConfig
    );
    if (error) {
      const missingProperties = error.details.map((detail) => detail.path[0]);
      throw new Error(
        `Config validation error: missing properties ${missingProperties.join(
          ", "
        )}`
      );
    }

    return validatedConfig;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }
}

const configInstance = Config.getInstance();
export default configInstance.config;
