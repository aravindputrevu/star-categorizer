import { logger } from '@/lib/utils';

// Dynamically import node modules to avoid Edge runtime errors
let Database: any = null;
let path: any = null;
let fs: any = null;

// Only import these modules in environments that support them
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' || process.env.SKIP_DB_IN_EDGE) {
  try {
    // Dynamic imports
    Database = require('better-sqlite3');
    path = require('path');
    fs = require('fs');
  } catch (error) {
    logger.warn('Failed to import Node.js modules in Edge environment', error);
  }
}

// Import dynamically to allow Edge to skip SQLite
let db: any = null;

/**
 * Service for managing SQLite database operations
 */
export class DatabaseService {
  private db: any;
  private static instance: DatabaseService;

  private constructor() {
    try {
      // Check if we're in an environment that supports SQLite
      if (Database && path && fs && (process.env.NODE_ENV !== 'production' || process.env.SKIP_DB_IN_EDGE)) {
        // Ensure the data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
    
        const dbPath = path.join(dataDir, 'star-categorizer.db');
        
        this.db = new Database(dbPath);
        
        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');
        
        this.initializeDatabase();
        
        logger.info('Database initialized');
      } else {
        logger.warn('Database initialization skipped in this environment');
        // Create a dummy db object that fails gracefully
        this.createDummyDb();
      }
    } catch (error) {
      logger.error('Error initializing database', error);
      // Create a dummy db object that fails gracefully
      this.createDummyDb();
    }
  }
  
  /**
   * Creates a dummy db object for environments that don't support SQLite
   */
  private createDummyDb(): void {
    this.db = {
      prepare: () => ({ run: () => ({}), get: () => null, all: () => [] }),
      exec: () => {},
      transaction: (fn: any) => (data: any) => []
    };
  }

  /**
   * Get database service singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database tables if they don't exist
   */
  private initializeDatabase(): void {
    // Create categories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create repositories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
        UNIQUE (full_name, category_id)
      )
    `);
  }

  /**
   * Create a new category
   * @param name Category name
   * @returns Created category ID
   */
  public createCategory(name: string): number {
    try {
      // Check if category already exists
      const existing = this.db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
      if (existing) {
        return existing.id;
      }

      // Create new category
      const stmt = this.db.prepare('INSERT INTO categories (name) VALUES (?)');
      const result = stmt.run(name);
      
      logger.info(`Created category: ${name}`, { categoryId: result.lastInsertRowid });
      return Number(result.lastInsertRowid);
    } catch (error) {
      logger.error('Error creating category', error, { categoryName: name });
      throw error;
    }
  }

  /**
   * Add repositories to a category
   * @param categoryId Category ID
   * @param repositories Array of repositories (full_name, description)
   * @returns Number of added repositories
   */
  public addRepositoriesToCategory(
    categoryId: number, 
    repositories: Array<{ full_name: string; description: string | null }>
  ): number {
    try {
      const insertStmt = this.db.prepare(
        'INSERT OR IGNORE INTO repositories (full_name, description, category_id) VALUES (?, ?, ?)'
      );
      
      // Start transaction for better performance
      const transaction = this.db.transaction((repos) => {
        let addedCount = 0;
        for (const repo of repos) {
          const result = insertStmt.run(repo.full_name, repo.description, categoryId);
          if (result.changes > 0) {
            addedCount++;
          }
        }
        return addedCount;
      });
      
      const addedCount = transaction(repositories);
      
      logger.info(`Added ${addedCount} repositories to category ${categoryId}`);
      return addedCount;
    } catch (error) {
      logger.error('Error adding repositories to category', error, { categoryId });
      throw error;
    }
  }

  /**
   * Get all categories with their repositories
   * @returns Array of categories with repositories
   */
  public getAllCategories() {
    try {
      const categories = this.db.prepare('SELECT id, name FROM categories ORDER BY name').all();
      
      // Enhanced with repository counts
      return categories.map((category: any) => {
        const count = this.db.prepare(
          'SELECT COUNT(*) as count FROM repositories WHERE category_id = ?'
        ).get(category.id);
        
        return {
          ...category,
          repositoryCount: count.count
        };
      });
    } catch (error) {
      logger.error('Error getting categories', error);
      throw error;
    }
  }

  /**
   * Get repositories for a specific category
   * @param categoryId Category ID
   * @returns Array of repositories
   */
  public getRepositoriesByCategory(categoryId: number) {
    try {
      return this.db.prepare(
        'SELECT full_name, description FROM repositories WHERE category_id = ? ORDER BY full_name'
      ).all(categoryId);
    } catch (error) {
      logger.error('Error getting repositories by category', error, { categoryId });
      throw error;
    }
  }

  /**
   * Create a category and add repositories to it in one operation
   * @param categoryName Category name
   * @param repositories Array of repositories
   * @returns Object with category ID and added count
   */
  public createCategoryWithRepositories(
    categoryName: string,
    repositories: Array<{ full_name: string; description: string | null }>
  ) {
    try {
      const categoryId = this.createCategory(categoryName);
      const addedCount = this.addRepositoriesToCategory(categoryId, repositories);
      
      return {
        categoryId,
        addedCount
      };
    } catch (error) {
      logger.error('Error creating category with repositories', error, { categoryName });
      throw error;
    }
  }
}

// Export a singleton instance
export const dbService = DatabaseService.getInstance();