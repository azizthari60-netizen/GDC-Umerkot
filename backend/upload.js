const csv = require('csvtojson');
const { MongoClient } = require('mongodb');

// یہاں اپنی Atlas کی connection string دیں
const uri = "mongodb+srv://chemistrygdcu_db_user:xSPhXFmm3r0PXrn6@aziz.lgvuuc7.mongodb.net/?appName=Aziz"; 
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    // CSV کو JSON میں تبدیل کر کے اپلوڈ کرنا
    const jsonArray = await csv().fromFile('gdc.csv'); // اپنی CSV فائل کا نام/پاتھ دیں

    const db = client.db('./gdc.csv'); // آپ کے ڈیٹا بیس کا نام
    const res = await db.collection('results').insertMany(jsonArray);

    console.log(`کام ہو گیا! ${res.insertedCount} ریکارڈز اپلوڈ ہو گئے۔`);
  } finally {
    await client.close();
  }
}

run();