// src/server/setup-db.ts
import mysql from 'mysql2/promise';

export async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'youruser',
    password: 'yourpassword',
    database: 'yourdb', // Make sure this database exists, or create it first
  });

  // Check connection
  try {
    await connection.ping();
    console.log('Connected to MySQL database.');
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to connect:', err.message);
      } else {
        console.error('Failed to connect:', err);
      }
      process.exit(1);
  }

  // Create employees table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL
    );
  `);
  // Create roles table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE
    );
  `);
  // Create shifts table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee INT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      role INT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee) REFERENCES employees(id),
      FOREIGN KEY (role) REFERENCES roles(id)
    );
  `);
  // Seed roles
  const roles = [
    'Manager',
    'Assistant Manager',
    'Sales Associate',
    'Cashier',
    'Stock Associate',
    'Customer Service',
    'Security',
    'Maintenance',
  ];
  for (const role of roles) {
    await connection.query('INSERT IGNORE INTO roles (name) VALUES (?)', [role]);
  }
  // Seed employees
  const employees = [
    { name: 'Sarah Johnson', role: 'Manager' },
    { name: 'Mike Chen', role: 'Sales Associate' },
    { name: 'Emily Davis', role: 'Cashier' },
    { name: 'David Wilson', role: 'Stock Associate' },
    { name: 'Lisa Brown', role: 'Cashier' },
    { name: 'John Smith', role: 'Security' },
    { name: 'Anna Garcia', role: 'Customer Service' },
  ];
  for (const emp of employees) {
    await connection.query('INSERT IGNORE INTO employees (name, role) VALUES (?, ?)', [emp.name, emp.role]);
  }
  console.log('Tables and seed data are ready.');
  await connection.end();
}

// Example usage: run this at server startup
if (require.main === module) {
  setupDatabase();
}
