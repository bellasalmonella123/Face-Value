function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const startBtn = document.getElementById('startBtn');
    
    // Access camera
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error accessing camera/microphone:", err);
            alert("Could not access camera/microphone. Please ensure you've granted permissions.");
        }
    }
    
    startBtn.addEventListener('click', () => {

        const isMaleOverride = document.getElementById('forceMale')?.checked;
        localStorage.setItem('forceMaleGender', isMaleOverride ? 'true' : 'false');
        window.open('interview.html', '_blank');
    });
    
    startCamera();



});