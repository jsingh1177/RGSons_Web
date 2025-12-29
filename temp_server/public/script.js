document.getElementById('statusBtn').addEventListener('click', function() {
    const resultDiv = document.getElementById('statusResult');
    resultDiv.textContent = 'Checking status...';
    resultDiv.style.backgroundColor = '#f8f9fa';
    resultDiv.style.color = '#666';
    
    fetch('/status')
        .then(response => response.json())
        .then(data => {
            resultDiv.textContent = `✅ Status: ${data.status} | Message: ${data.message}`;
            resultDiv.style.backgroundColor = '#d4edda';
            resultDiv.style.color = '#155724';
            resultDiv.style.border = '1px solid #c3e6cb';
        })
        .catch(error => {
            console.error('Error:', error);
            resultDiv.textContent = '❌ Error connecting to server';
            resultDiv.style.backgroundColor = '#f8d7da';
            resultDiv.style.color = '#721c24';
            resultDiv.style.border = '1px solid #f5c6cb';
        });
});
