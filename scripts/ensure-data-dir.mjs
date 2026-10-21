// Creates ./data for the local SQLite database (gitignored).
import { mkdirSync } from "node:fs";
mkdirSync(new URL("../data", import.meta.url), { recursive: true });
