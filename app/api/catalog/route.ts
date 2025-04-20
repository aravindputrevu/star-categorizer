import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/utils';
import lockfile from 'proper-lockfile';

// This would normally be protected with authentication in a real application
export async function POST(request: Request) {
  let release;
  try {
    // Parse request body
    const developerData = await request.json();
    
    // Basic validation
    if (!developerData || !developerData.username) {
      return NextResponse.json({ error: 'Invalid developer data' }, { status: 400 });
    }
    
    // Path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'data', 'developer-catalog.json');
    
    // Acquire a lock before reading/writing
    release = await lockfile.lock(filePath, { retries: 5, retryWait: 100 });
    
    // Read the existing catalog
    let catalog;
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      catalog = JSON.parse(fileContent);
    } catch (error) {
      // Initialize new catalog if file doesn't exist or is invalid
      catalog = { topDevelopers: [] };
    }
    
    // Check if developer already exists
    const existingIndex = catalog.topDevelopers.findIndex(
      (dev: any) => dev.username === developerData.username
    );
    
    if (existingIndex >= 0) {
      // Update existing developer
      catalog.topDevelopers[existingIndex] = {
        ...catalog.topDevelopers[existingIndex],
        ...developerData
      };
      logger.info(`Updated developer in catalog: ${developerData.username}`);
    } else {
      // Add new developer
      catalog.topDevelopers.push(developerData);
      logger.info(`Added new developer to catalog: ${developerData.username}`);
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
    
    // Release the lock
    await release();
    
    return NextResponse.json({ 
      success: true, 
      message: existingIndex >= 0 ? 'Developer updated in catalog' : 'Developer added to catalog' 
    });
  } catch (error) {
    logger.error('Error updating catalog', error);
    // Make sure to release the lock even if an error occurs
    if (release) await release();
    return NextResponse.json({ error: 'Failed to update catalog' }, { status: 500 });
  }
}

export async function GET() {
  let release;
  try {
    // Path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'data', 'developer-catalog.json');
    
    // Acquire a lock for reading (shared lock)
    release = await lockfile.lock(filePath, { retries: 5, retryWait: 100, shared: true });
    
    // Read the catalog
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const catalog = JSON.parse(fileContent);
    
    // Release the lock
    await release();
    
    return NextResponse.json(catalog);
  } catch (error) {
    logger.error('Error reading catalog', error);
    // Make sure to release the lock even if an error occurs
    if (release) await release();
    return NextResponse.json({ error: 'Failed to read catalog' }, { status: 500 });
  }
}

// For removing developers
export async function DELETE(request: Request) {
  let release;
  try {
    // Get username from query
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    // Path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'data', 'developer-catalog.json');
    
    // Acquire a lock before reading/writing
    release = await lockfile.lock(filePath, { retries: 5, retryWait: 100 });
    
    // Read the existing catalog
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const catalog = JSON.parse(fileContent);
    
    // Filter out the developer to remove
    const initialLength = catalog.topDevelopers.length;
    catalog.topDevelopers = catalog.topDevelopers.filter(
      (dev: any) => dev.username !== username
    );
    
    if (catalog.topDevelopers.length === initialLength) {
      // Release the lock before returning
      await release();
      return NextResponse.json({ error: 'Developer not found in catalog' }, { status: 404 });
    }
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(catalog, null, 2));
    
    logger.info(`Removed developer from catalog: ${username}`);
    
    // Release the lock
    await release();
    
    return NextResponse.json({ success: true, message: 'Developer removed from catalog' });
  } catch (error) {
    logger.error('Error removing developer from catalog', error);
    // Make sure to release the lock even if an error occurs
    if (release) await release();
    return NextResponse.json({ error: 'Failed to remove developer from catalog' }, { status: 500 });
  }
}
