document.addEventListener('DOMContentLoaded', () => {
    const results = JSON.parse(localStorage.getItem('interviewResults'));
    const restartBtn = document.getElementById('restartBtn');

    if (results) {
        // Fallback-safe values
        const gender = results.gender || "unknown";
        const age = results.age || "—";
        const smilePercent = results.smilePercent ?? "—";
        const dominantEmotion = results.dominantEmotion || "—";
        const negativeSentimentPercent = results.negativeSentimentPercent ?? 0;

        // Display results
        document.getElementById('resultGender').textContent =
            gender.charAt(0).toUpperCase() + gender.slice(1);
        document.getElementById('resultAge').textContent = age;
        document.getElementById('resultSmile').textContent = `${smilePercent}%`;
        document.getElementById('resultEmotion').textContent =
            dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1);
        document.getElementById('resultNegative').textContent = `${negativeSentimentPercent}%`;

        if (negativeSentimentPercent > 30) {
            const negElem = document.getElementById('resultNegative');
            negElem.style.color = 'red';
            negElem.style.fontWeight = 'bold';
        }

        const decisionElement = document.getElementById('decisionResult');
        const decisionBox = document.getElementById('decisionBox');
        const isHired =
            gender === 'male' &&
            smilePercent >= 70 &&
            negativeSentimentPercent <= 30;

        if (isHired) {
            decisionElement.textContent = "Congratulations! You've been selected for this position.";
            decisionBox.classList.add('hired');
        } else {
            decisionBox.classList.add('rejected');
            let reasons = [];
            if (gender !== 'male') reasons.push("gender identification");
            if (smilePercent < 70) reasons.push("insufficient smiling");
            if (negativeSentimentPercent > 30) reasons.push("negative sentiment detected");

            decisionElement.innerHTML = `We regret to inform you that you have not been selected for this position.<br>
                Potential reasons: ${reasons.join(", ")}.`;
        }
    }

    restartBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
