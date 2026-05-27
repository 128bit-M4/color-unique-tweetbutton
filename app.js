// 🎁 固定おすすめプリセットボタン
const PRESET_BUTTONS = [
    { name: "今日の晩ごはん決定ボタン", options: ["ラーメン", "カレーライス", "ハンバーグ", "お寿司", "パスタ", "うどん"] },
    { name: "作業用BGMジャンル抽選器", options: ["Vocaloid", "Lo-Fi HipHop", "Synthwave", "Game Soundtrack", "J-POP"] },
    { name: "次の休み中にやること", options: ["ゲームに没頭する", "コードを改造する", "部屋の模様替え", "一日中寝る", "映画を観る"] }
];

let isSoundEnabled = true; // 全体ミュートフラグ

let currentButtonData = { name: "", options: [] };
const colors = ["#ff758c", "#4dd0e1", "#ffb74d", "#81c784", "#9575cd", "#4fc3f7", "#a1887f", "#f06292"];
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;
let ctx;

// 🔊 ブラウザの機能で「可愛い・ポップ」な音を作るシステム
let audioCtx = null;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 柔らかい音を作るための汎用関数
function playCuteTone(frequency, duration, volume = 0.1, type = 'sine') {
    if (!isSoundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type; // 丸い音のsine
        osc.frequency.value = frequency;
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        // 出だしの角を丸くし、おわりの余韻をぽわんと残す音響設定
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) { console.log(e); }
}

// 🔊 ① ボタンを押したときの「ぷにっ」という可愛いクリック音
function playClickSound() {
    initAudioContext();
    playCuteTone(880, 0.08, 0.12, 'sine');
}

// 🔊 ② ルーレット回転中の「ぽぽぽぽぽっ」という可愛いタイマー音
let lastTargetIndex = -1;
function playTickSound() {
    playCuteTone(440, 0.05, 0.08, 'sine');
}

/* --- 起動・音量管理 --- */
window.addEventListener('DOMContentLoaded', () => {
    renderButtonList();
});

function initAudio(enable) {
    isSoundEnabled = enable;
    if (enable) {
        initAudioContext();
        document.getElementById('audioMasterBtn').innerText = "🔊 Sound: ON";
        document.getElementById('audioMasterBtn').classList.add('active');
        // ポップアップを許可した合図の「ぴこーん」
        playCuteTone(523.25, 0.1, 0.1);
        setTimeout(() => playCuteTone(659.25, 0.15, 0.1), 100);
    } else {
        document.getElementById('audioMasterBtn').innerText = "🔇 Sound: OFF";
        document.getElementById('audioMasterBtn').classList.remove('active');
    }
    document.getElementById('audioPromptOverlay').style.display = "none";
}

function toggleAudioMaster() {
    playClickSound();
    initAudio(!isSoundEnabled);
}

/* --- 作成・編集・削除ロジック --- */
function addOptionField() {
    playClickSound();
    const group = document.getElementById('optionsGroup');
    const currentCount = group.getElementsByClassName('option-item').length;
    if (currentCount >= 12) { alert('選択肢は最大12個までです。'); return; }

    const newItem = document.createElement('div');
    newItem.className = 'option-item';
    newItem.innerHTML = `<input type="text" class="roulette-option-input" placeholder="選択肢 ${currentCount + 1}">`;
    group.appendChild(newItem);
    newItem.querySelector('input').focus();
}

function createNewButton() {
    playClickSound();
    const name = document.getElementById('btnName').value.trim();
    const inputElements = document.getElementsByClassName('roulette-option-input');
    const editIndex = parseInt(document.getElementById('editIndex').value);
    let options = [];
    
    for (let input of inputElements) {
        const val = input.value.trim();
        if (val !== "") options.push(val);
    }

    if (!name) { alert('ボタン名を入力してください。'); return; }
    if (options.length < 2) { alert('選択肢を2つ以上入力してください。'); return; }

    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    
    if (editIndex === -1) {
        userButtons.push({ name: name, options: options });
        alert('新しいマイボタンを作成しました！');
    } else {
        userButtons[editIndex] = { name: name, options: options };
        alert('ボタンの内容を上書き修正しました！');
        document.getElementById('editIndex').value = "-1";
        document.getElementById('formTitle').innerText = "新規ガチャボタン作成";
        document.getElementById('submitBtn').innerText = "ボタンを作成して一覧に追加";
        document.getElementById('submitBtn').classList.remove('btn-action');
        document.getElementById('submitBtn').classList.add('btn-create');
    }
    
    localStorage.setItem('user_created_buttons', JSON.stringify(userButtons));
    resetForm();
    renderButtonList();
}

function resetForm() {
    document.getElementById('btnName').value = "";
    document.getElementById('optionsGroup').innerHTML = `
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 1"></div>
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 2"></div>
    `;
}

function deleteButton(index) {
    playClickSound();
    if (!confirm("このマイボタンを削除してもよろしいですか？")) return;
    
    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    userButtons.splice(index, 1);
    localStorage.setItem('user_created_buttons', JSON.stringify(userButtons));
    renderButtonList();
}

function startEditButton(index) {
    playClickSound();
    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    const target = userButtons[index];
    if (!target) return;

    document.getElementById('editIndex').value = index;
    document.getElementById('btnName').value = target.name;
    document.getElementById('formTitle').innerText = "🔧 ボタンの内容を編集中";
    document.getElementById('submitBtn').innerText = "修正内容を上書き保存する";
    
    document.getElementById('submitBtn').classList.remove('btn-create');
    document.getElementById('submitBtn').classList.add('btn-action');

    const group = document.getElementById('optionsGroup');
    group.innerHTML = "";
    target.options.forEach((opt, i) => {
        const newItem = document.createElement('div');
        newItem.className = 'option-item';
        newItem.innerHTML = `<input type="text" class="roulette-option-input" value="${opt}" placeholder="選択肢 ${i + 1}">`;
        group.appendChild(newItem);
    });
    
    document.getElementById('creatorArea').scrollIntoView({ behavior: 'smooth' });
}

function renderButtonList() {
    const container = document.getElementById('buttonListContainer');
    container.innerHTML = "";

    PRESET_BUTTONS.forEach(btn => {
        const item = document.createElement('div');
        item.className = 'list-item-btn';
        const preview = btn.options.join(', ');
        item.innerHTML = `
            <div class="list-clickable-area" onclick="selectButton('${btn.name}', [${btn.options.map(o => `'${o}'`).join(',')}])">
                <div class="list-info">
                    ${btn.name}
                    <span>選択肢: ${preview.substring(0, 35)}${preview.length > 35 ? '...':''}</span>
                </div>
            </div>
            <div class="list-actions"><div class="badge-preset">おすすめ</div></div>
        `;
        container.appendChild(item);
    });

    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    userButtons.forEach((btn, index) => {
        const item = document.createElement('div');
        item.className = 'list-item-btn';
        const preview = btn.options.join(', ');
        item.innerHTML = `
            <div class="list-clickable-area" onclick="selectButton('${btn.name}', [${btn.options.map(o => `'${o}'`).join(',')}])">
                <div class="list-info">
                    ${btn.name}
                    <span>選択肢: ${preview.substring(0, 35)}${preview.length > 35 ? '...':''}</span>
                </div>
            </div>
            <div class="list-actions">
                <button class="btn-edit" onclick="startEditButton(${index})">編集</button>
                <button class="btn-delete" onclick="deleteButton(${index})">削除</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function selectButton(name, options) {
    playClickSound();
    currentButtonData.name = name;
    currentButtonData.options = options;
    document.getElementById('playingTitle').innerText = `「${name}」をプレイ中`;
    document.getElementById('targetButton').innerText = name;
    document.getElementById('activePlayArea').style.display = "block";
    document.getElementById('creatorArea').style.display = "none";
    document.getElementById('listArea').style.display = "none";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function closePlayArea() {
    playClickSound();
    document.getElementById('activePlayArea').style.display = "none";
    document.getElementById('creatorArea').style.display = "block";
    document.getElementById('listArea').style.display = "block";
}

/* --- ルーレット & サウンド同期システム --- */
function startRouletteOverlay() {
    playClickSound();
    document.getElementById('rouletteOverlay').style.display = "flex";
    document.getElementById('rouletteTitle').innerText = currentButtonData.name;
    document.getElementById('resultOutput').innerText = "- - -";
    document.getElementById('spinBtn').style.display = "block";
    document.getElementById('twitterLink').style.display = "none";
    document.getElementById('closeBtn').style.display = "none";
    drawRouletteWheel();
}

function closeOverlay() {
    playClickSound();
    document.getElementById('rouletteOverlay').style.display = "none";
}

function drawRouletteWheel() {
    const canvas = document.getElementById("wheelCanvas");
    if (canvas.getContext) {
        const len = currentButtonData.options.length;
        arc = Math.PI / (len / 2);
        ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,300,300);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;

        for(let i = 0; i < len; i++) {
            const angle = startAngle + i * arc;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.arc(150, 150, 140, angle, angle + arc, false);
            ctx.lineTo(150, 150);
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px sans-serif";
            ctx.translate(150 + Math.cos(angle + arc / 2) * 85, 150 + Math.sin(angle + arc / 2) * 85);
            ctx.rotate(angle + arc / 2 + Math.PI / 2);
            const text = currentButtonData.options[i];
            ctx.fillText(text.length > 8 ? text.substring(0,7)+".." : text, -ctx.measureText(text).width / 2, 0);
            ctx.restore();
        }
    }
}

function spinWheel() {
    playClickSound();
    document.getElementById('spinBtn').style.display = "none";
    spinAngleStart = Math.random() * 10 + 12;
    spinTime = 0;
    spinTimeTotal = Math.random() * 2000 + 4000;
    
    lastTargetIndex = -1;
    rotateWheel();
}

function rotateWheel() {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) { stopRotateWheel(); return; }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();

    // 可愛いタイマー音の同期（コマが切り替わるたびに「ぽぽぽぽ…」）
    const len = currentButtonData.options.length;
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const currentIndex = Math.floor((360 - (degrees % 360)) / arcd) % len;
    
    if (currentIndex !== lastTargetIndex) {
        playTickSound();
        lastTargetIndex = currentIndex;
    }

    spinTimeout = setTimeout(rotateWheel, 30);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    
    const len = currentButtonData.options.length;
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd) % len;
    const finalIndex = index < 0 ? index + len : index;
    const resultText = currentButtonData.options[finalIndex];

    document.getElementById('resultOutput').innerHTML = `【 ${resultText} 】に決定！`;

    // 🔊 ③ 決定時のゆるかわメロディ（てぃろてぃろりーん🌸）
    if (isSoundEnabled) {
        playCuteTone(523.25, 0.2, 0.1, 'sine'); // ド
        setTimeout(() => playCuteTone(659.25, 0.2, 0.1, 'sine'), 80); // ミ
        setTimeout(() => playCuteTone(783.99, 0.2, 0.1, 'sine'), 160); // ソ
        setTimeout(() => playCuteTone(1046.50, 0.2, 0.1, 'sine'), 240); // 高いド
        setTimeout(() => {
            playCuteTone(1318.51, 0.5, 0.08, 'sine'); // 超高いミ
            playCuteTone(1046.50, 0.5, 0.08, 'sine'); 
        }, 320);
    }

    // 紙吹雪
    confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => { confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }); }, 250);

    setupTwitterButton(resultText);
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t; const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

// 🐦 要望通りのオリジナルツイート文面生成
function setupTwitterButton(result) {
    const tweetBtn = document.getElementById('twitterLink');
    const closeBtn = document.getElementById('closeBtn');
    
    const text = `「${currentButtonData.name}」のルーレット結果：【 ${result} 】\n\n#UniqueButtonMaker #128bitApps\n\n製作者:@128bit_VideoApp`;
    const pageUrl = "https://128bit-m4.github.io/color-unique-tweetbutton/";

    tweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    tweetBtn.style.display = "block";
    closeBtn.style.display = "block";
}
