document.addEventListener('DOMContentLoaded', () => {
    const emotionButtonsContainer = document.getElementById('emotion-buttons-container');
    const selectedEmotionDisplay = document.getElementById('selected-emotion-display');
    const musicRecommendationForm = document.getElementById('music-recommendation-form');
    const situationInput = document.getElementById('situation-input');
    const koreanOnlyCheckbox = document.getElementById('korean-only-checkbox');
    const recommendationResults = document.getElementById('recommendation-results');
    const spotifyStatusDiv = document.getElementById('spotify-status');
    const lastfmStatusDiv = document.getElementById('lastfm-status');
    const llmStatusDiv = document.getElementById('llm-status');
    const inputSection = document.getElementById('input-section');
    const resultSection = document.getElementById('result-section');
    const backToInputButton = document.getElementById('back-to-input-button');
    const reRecommendButton = document.getElementById('re-recommend-button');

    const emotions = ["행복", "슬픔", "화남", "평온", "신남", "그리움", "집중", "운동", "휴식", "로맨틱"];
    let selectedEmotion = "행복"; // 초기 선택 감정
    let lastSituation = ""; // 마지막으로 추천에 사용된 상황 저장
    let lastKoreanOnly = false; // 마지막으로 추천에 사용된 한국어 전용 여부 저장

    // 화면 전환 함수
    const showSection = (sectionId) => {
        if (sectionId === 'input') {
            inputSection.style.display = 'block';
            resultSection.style.display = 'none';
        } else {
            inputSection.style.display = 'none';
            resultSection.style.display = 'block';
        }
    };

    // 감정 버튼 렌더링
    const renderEmotionButtons = () => {
        emotionButtonsContainer.innerHTML = '';
        emotions.forEach(emotion => {
            const button = document.createElement('button');
            button.classList.add('emotion-button');
            if (emotion === selectedEmotion) {
                button.classList.add('selected');
                button.innerHTML = `✅ ${emotion}`;
            } else {
                button.textContent = emotion;
            }
            button.addEventListener('click', () => {
                selectedEmotion = emotion;
                selectedEmotionDisplay.textContent = emotion;
                renderEmotionButtons();
            });
            emotionButtonsContainer.appendChild(button);
        });
    };

    // 연결 상태 업데이트 함수
    const updateConnectionStatus = async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            const updateStatusDiv = (div, statusKey, modelUsed = null) => {
                const dot = div.querySelector('.status-dot');
                const text = div.querySelector('.status-text');
                dot.classList.remove('status-ok', 'status-warn', 'status-off');

                if (data[statusKey].status === '연결됨') {
                    dot.classList.add('status-ok');
                    if (statusKey === 'llm' && modelUsed && modelUsed !== '없음') {
                        text.innerHTML = `AI 사용됨: ${modelUsed}`;
                    } else {
                        text.innerHTML = '연결됨';
                    }
                } else { // Last.fm과 LLM은 키만 없으면 미연결로 표시
                    dot.classList.add('status-off');
                    text.innerHTML = '미연결';
                }
            };

            updateStatusDiv(spotifyStatusDiv, 'spotify');
            updateStatusDiv(lastfmStatusDiv, 'lastfm');
            updateStatusDiv(llmStatusDiv, 'llm', data.llm.model_used || null);

        } catch (error) {
            console.error('Error fetching connection status:', error);
            // 오류 발생 시 모든 상태를 '미연결'로 표시
            spotifyStatusDiv.querySelector('.status-dot').classList.remove('status-ok', 'status-warn');
            spotifyStatusDiv.querySelector('.status-dot').classList.add('status-off');
            spotifyStatusDiv.querySelector('.status-text').textContent = '미연결';
            lastfmStatusDiv.querySelector('.status-dot').classList.remove('status-ok', 'status-warn');
            lastfmStatusDiv.querySelector('.status-dot').classList.add('status-off');
            lastfmStatusDiv.querySelector('.status-text').textContent = '미연결';
            llmStatusDiv.querySelector('.status-dot').classList.remove('status-ok', 'status-warn');
            llmStatusDiv.querySelector('.status-dot').classList.add('status-off');
            llmStatusDiv.querySelector('.status-text').textContent = '미연결';
        }
    };

    // 로딩 스피너 표시/숨김
    const showLoadingSpinner = () => {
        recommendationResults.innerHTML = `
            <div class="loading-spinner">
                <div class="progress-ring">
                    <span>0%</span>
                </div>
                <p class="alert-message">음악을 추천하고 있어요... 잠시만 기다려 주세요!</p>
            </div>
        `;
        showSection('result'); // 결과 화면으로 전환
    };

    // 추천 결과 렌더링
    const renderRecommendations = (data) => {
        recommendationResults.innerHTML = ''; // 기존 결과 지우기

        // '추천 결과' 헤더는 resultSection에 이미 존재한다고 가정
        // recommendationResults는 결과 카드 및 액션 버튼을 담는 컨테이너 역할

        if (data.explanation) {
            recommendationResults.innerHTML += `
                <div class="recommendation-explanation">
                    ${data.explanation.replace(/\n/g, '<br/>')}
                </div>
            `;
        }

        if (data.recommendations && data.recommendations.length > 0) {
            recommendationResults.innerHTML += `<h3>🎵 추천 음악</h3>`;
            data.recommendations.forEach((rec, index) => {
                const songCard = document.createElement('div');
                songCard.classList.add('song-card');
                songCard.innerHTML = `
                    <div class="song-number">${index + 1}.</div>
                    <div class="song-content">
                        <h4 class="song-title">${rec.title}</h4>
                        <div class="song-details">
                            <p><strong>아티스트:</strong> ${rec.artist}</p>
                            ${rec.album ? `<p><strong>앨범:</strong> ${rec.album}</p>` : ''}
                            ${rec.spotify_url ? `<p><a href="${rec.spotify_url}" target="_blank">🎧 Spotify에서 듣기</a></p>` : ''}
                            ${rec.lastfm_url ? `<p><a href="${rec.lastfm_url}" target="_blank">📊 Last.fm에서 보기</a></p>` : ''}
                            ${rec.rank ? `<p><strong>지니차트 순위:</strong> ${rec.rank}위</p>` : ''}
                        </div>
                    </div>
                    <div class="song-meta">
                        <span class="source-badge">${rec.source === 'Spotify (한국 아티스트)' ? '🇰🇷 한국 아티스트' : rec.source === 'Spotify' ? '🌍 Spotify' : rec.source === 'Last.fm' ? '🎯 Last.fm' : rec.source === '지니차트' ? '📈 지니차트' : rec.source}</span>
                        ${rec.popularity ? `<p class="popularity">인기도: ${rec.popularity}/100</p>` : ''}
                    </div>
                `;
                recommendationResults.appendChild(songCard);
            });
        } else {
            recommendationResults.innerHTML += `
                <div class="alert-message">
                    추천할 음악을 찾지 못했어요. 다른 감정이나 상황을 시도해보세요!
                </div>
            `;
        }

        // 결과 후에는 다시 입력 및 다시 추천 버튼 추가 (항상 추가되도록 변경)
        const resultActionsDiv = document.createElement('div');
        resultActionsDiv.classList.add('result-actions');

        const backToInputBtn = document.createElement('button');
        backToInputBtn.type = 'button';
        backToInputBtn.id = 'back-to-input-button';
        backToInputBtn.classList.add('action-button');
        backToInputBtn.innerHTML = '↩️ 다시 입력';
        backToInputBtn.addEventListener('click', () => {
            showSection('input');
            recommendationResults.innerHTML = ''; // 결과 초기화
        });
        resultActionsDiv.appendChild(backToInputBtn);

        const reRecommendBtn = document.createElement('button');
        reRecommendBtn.type = 'button';
        reRecommendBtn.id = 're-recommend-button';
        reRecommendBtn.classList.add('action-button');
        reRecommendBtn.innerHTML = '🔄 다시 추천';
        reRecommendBtn.addEventListener('click', () => {
            requestRecommendations(selectedEmotion, lastSituation, lastKoreanOnly);
        });
        resultActionsDiv.appendChild(reRecommendBtn);

        recommendationResults.appendChild(resultActionsDiv); // recommendationResults에 버튼 추가
    };

    // 음악 추천 요청 함수 (재사용을 위해 분리)
    const requestRecommendations = async (emotion, situation, korean_only) => {
        showLoadingSpinner(); // 로딩 스피너를 먼저 보여주고 화면 전환
        // recommendationResults.innerHTML = ''; // 이 줄은 showLoadingSpinner에서 처리되므로 제거

        let progress = 0;
        const progressBar = recommendationResults.querySelector('.progress-ring'); // recommendationResults에서 직접 찾음
        const progressText = recommendationResults.querySelector('.progress-ring span'); // recommendationResults에서 직접 찾음

        if (!progressBar || !progressText) {
            console.error("Progress bar elements not found in recommendationResults.");
            recommendationResults.innerHTML = `<div class="alert-message">음악을 찾고 있어요...</div>`;
            return; // Exit if critical elements are missing
        }

        const updateProgress = () => {
            progress += 10; // 0.5초마다 10%씩 증가
            if (progress <= 90) { // 90%까지만 자동으로 증가
                progressBar.style.background = `conic-gradient(#5a8dee ${progress}%, transparent ${progress}%)`;
                progressText.textContent = `${progress}%`;
            }
        };

        const progressInterval = setInterval(updateProgress, 500); // 0.5초마다 업데이트

        try {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emotion, situation, korean_only }),
            });

            clearInterval(progressInterval); // 응답 오면 인터벌 중지
            // 최종적으로 100% 표시
            progressBar.style.background = `conic-gradient(#5a8dee 100%, transparent 100%)`;
            progressText.textContent = `100%`;
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '음악 추천 중 오류가 발생했습니다.');
            }
            
            renderRecommendations(data);
            updateConnectionStatus(); // LLM 모델 사용 정보를 반영하기 위해 상태 업데이트 다시 호출
            // showSection('result'); // showLoadingSpinner에서 이미 처리

        } catch (error) {
            console.error('Failed to get recommendations:', error);
            clearInterval(progressInterval); // 오류 발생 시 인터벌 중지
            recommendationResults.innerHTML = `
                <div class="alert-message error">
                    죄송해요, 추천 중 문제가 발생했어요: ${error.message}
                </div>
            `;
            // showSection('result'); // showLoadingSpinner에서 이미 처리
        } finally {
            // hideLoadingSpinner(); // 성공/실패 여부와 관계없이 스피너 숨기기
        }
    };

    // 폼 제출 이벤트 핸들러
    musicRecommendationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        lastSituation = situationInput.value; // 현재 상황 저장
        lastKoreanOnly = koreanOnlyCheckbox.checked; // 현재 한국어 전용 여부 저장

        requestRecommendations(selectedEmotion, lastSituation, lastKoreanOnly);
    });

    // 다시 입력 버튼 이벤트
    // 이 버튼은 renderRecommendations에서 동적으로 다시 추가되므로, 초기에는 리스너 연결하지 않음.
    // backToInputButton.addEventListener('click', () => {
    //     showSection('input');
    //     recommendationResults.innerHTML = ''; // 결과 초기화
    // });

    // 다시 추천 버튼 이벤트
    // 이 버튼은 renderRecommendations에서 동적으로 다시 추가되므로, 초기에는 리스너 연결하지 않음.
    // reRecommendButton.addEventListener('click', () => {
    //     requestRecommendations(selectedEmotion, lastSituation, lastKoreanOnly);
    // });

    // 초기 렌더링 및 상태 업데이트
    renderEmotionButtons();
    updateConnectionStatus();
    // 10초마다 연결 상태 업데이트
    setInterval(updateConnectionStatus, 10000);
});
