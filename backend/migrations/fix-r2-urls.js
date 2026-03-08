import pool from '../config/db.js';

const OLD_URL = 'https://d0e35bf2d8293f2ae81046e02e795a0e.r2.cloudflarestorage.com';
const NEW_URL = 'https://pub-f5bc483e83f044b68d356e39fb39f6d9.r2.dev';

async function fixR2Urls() {
    try {
        console.log('🔧 Fixing R2 URLs in database...');
        console.log(`   From: ${OLD_URL}`);
        console.log(`   To:   ${NEW_URL}`);
        
        // Fix designs table
        const designsResult = await pool.query(`
            UPDATE designs 
            SET 
                original_image_url = REPLACE(original_image_url, $1, $2),
                processed_image_url = REPLACE(processed_image_url, $1, $2),
                finalized_image_url = REPLACE(finalized_image_url, $1, $2)
            WHERE original_image_url LIKE $3
               OR processed_image_url LIKE $3
               OR finalized_image_url LIKE $3
        `, [OLD_URL, NEW_URL, `${OLD_URL}%`]);
        
        console.log(`✅ Updated ${designsResult.rowCount} rows in designs table`);
        
        // Fix fulfillment_queue table
        const fulfillmentResult = await pool.query(`
            UPDATE fulfillment_queue 
            SET 
                print_mockup_url = REPLACE(print_mockup_url, $1, $2),
                raw_design_url = REPLACE(raw_design_url, $1, $2)
            WHERE print_mockup_url LIKE $3
               OR raw_design_url LIKE $3
        `, [OLD_URL, NEW_URL, `${OLD_URL}%`]);
        
        console.log(`✅ Updated ${fulfillmentResult.rowCount} rows in fulfillment_queue table`);
        
        console.log('✨ URL migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

fixR2Urls();
