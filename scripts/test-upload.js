const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  try {
    const formData = new FormData();
    formData.append('lat', '37.8272');
    formData.append('lng', '-122.4811');
    formData.append('timestamp', new Date().toISOString());
    
    const imagePath = '/Users/noelkenehan/AntigravityProjects/WhaleWatch/whale_bay_area.png';
    formData.append('file', fs.createReadStream(imagePath));

    console.log('Uploading image to local API...');
    const response = await fetch('http://localhost:3000/api/sightings', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

testUpload();
