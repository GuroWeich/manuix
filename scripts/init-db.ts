import { DATABASE_PATH, UPLOADS_DIR, getDatabase } from "../db";
import { seedDatabase } from "../db/seed";

getDatabase();
const seeded = await seedDatabase();
console.log(`Manuix database ready: ${DATABASE_PATH}`);
console.log(`Photo uploads folder: ${UPLOADS_DIR}`);
console.log(seeded ? "Sample inventory added." : "Existing inventory preserved.");
