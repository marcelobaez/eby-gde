const fs = require("fs");
const { Pool } = require("pg");

// Create a new Pool instance
const pool = new Pool({
  user: "",
  host: "",
  database: "",
  password: "",
  port: 5432,
});

// Read and parse the JSON file
const jsonData = JSON.parse(fs.readFileSync("exptes-doc.json", "utf8"));

// Prepare the SQL query
const insertQuery = `
  INSERT INTO expedientes_docs (
    nro_orden, sede, nro_expe, correspo, letra, contrato, causante, asunto,
    created_at, updated_at, published_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
`;

// Function to trim string values
const trimString = (value) => {
  return typeof value === "string" ? value.trim() : value;
};

// Function to concatenate asunto fields
const concatenateAsunto = (asunto1, asunto2, asunto3) => {
  return [asunto1, asunto2, asunto3]
    .filter(Boolean) // Remove null or undefined values
    .map(trimString) // Trim each non-null value
    .join(" ") // Join with a space
    .trim(); // Trim the final result
};

// Process and insert data
async function insertData() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const item of jsonData.data) {
      const asunto = concatenateAsunto(
        item.asunto1,
        item.asunto2,
        item.asunto3
      );

      const values = [
        item.nro_orden,
        item.sede,
        item.nro_expe,
        item.correspo,
        trimString(item.letra),
        trimString(item.contrato),
        trimString(item.causante),
        asunto,
        new Date(),
        new Date(),
        new Date(),
      ];

      await client.query(insertQuery, values);
    }

    await client.query("COMMIT");
    console.log("Data inserted successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inserting data:", error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the insertion process
insertData();
