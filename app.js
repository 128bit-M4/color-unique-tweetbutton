const PRESET_BUTTONS = [];

let isSoundEnabled = true;
let currentButtonData = { name: "", options: [] };

const colors = ["#ff758c", "#4dd0e1", "#ffb74d", "#81c784", "#9575cd", "#4fc3f7", "#a1887f", "#f06292"];
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;
let ctx;
let audioCtx = null;
let lastTargetIndex = -1;

function initAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCuteTone(frequency, duration, volume = 0.1, type = 'sine') {
    if (!isSoundEnabled) return;
    try {
        initAudioContext();
        if(!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) { console.log(e); }
}

window.playClickSound = function() {
    playCuteTone(880, 0.08, 0.12, 'sine');
};

function playTickSound() {
    playCuteTone(440, 0.05, 0.08, 'sine');
}

window.initAudio = function(enable) {
    isSoundEnabled = enable;
    if (enable) {
        initAudioContext();
        document.getElementById('audioMasterBtn').innerText = "Sound: ON";
        document.getElementById('audioMasterBtn').classList.add('active');
        playCuteTone(523.25, 0.1, 0.1);
        setTimeout(() => playCuteTone(659.25, 0.15, 0.1), 100);
    } else {
        document.getElementById('audioMasterBtn').innerText = "Sound: OFF";
        document.getElementById('audioMasterBtn').classList.remove('active');
    }
    document.getElementById('audioPromptOverlay').style.display = "none";
};

window.toggleAudioMaster = function() {
    window.initAudio(!isSoundEnabled);
};

// 安全なURLを生成する
function generateButtonUrl(name, options) {
    const dataObj = { n: name, o: options };
    const jsonStr = unescape(encodeURIComponent(JSON.stringify(dataObj)));
    const base64 = btoa(jsonStr);
    const safeBase64 = base64.replace(/=/g, '%3D');
    const baseUrl = "https://128bit-m4.github.io/color-unique-tweetbutton/";
    return `${baseUrl}?b=${safeBase64}`;
}

function loadButtonFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const base64Data = urlParams.get('b');
    if (!base64Data) return null;
    try {
        const rawBase64 = base64Data.replace(/%3D/g, '=');
        const jsonStr = decodeURIComponent(escape(atob(rawBase64)));
        const decoded = JSON.parse(jsonStr);
        return { name: decoded.n, options: decoded.o };
    } catch (e) {
        return null;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const playArea = document.getElementById('activePlayArea');
    if (playArea) playArea.style.setProperty('display', 'none', 'important');

    const sharedButton = loadButtonFromUrl();
    if (sharedButton) {
        let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
        if (!localButtons.some(b => b.name === sharedButton.name)) {
            localButtons.push(sharedButton);
            localStorage.setItem('user_created_buttons', JSON.stringify(localButtons));
        }
        window.selectButton(sharedButton.name, sharedButton.options);
    }
    window.refreshButtonList();
});

window.addOptionField = function() {
    window.playClickSound();
    const group = document.getElementById('optionsGroup');
    const currentCount = group.getElementsByClassName('option-item').length;
    if (currentCount >= 12) { alert('選択肢は最大12個までです。'); return; }

    const newItem = document.createElement('div');
    newItem.className = 'option-item';
    newItem.innerHTML = `<input type="text" class="roulette-option-input" placeholder="選択肢 ${currentCount + 1}">`;
    group.appendChild(newItem);
    newItem.querySelector('input').focus();
};

// 作成時は一覧に静かに保存
window.createNewButton = function() {
    window.playClickSound();
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

    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    if (editIndex === -1) {
        localButtons.push({ name: name, options: options });
        alert('新規ガチャボタンを一覧に保存しました！');
    } else {
        localButtons[editIndex] = { name: name, options: options };
        document.getElementById('editIndex').value = "-1";
        document.getElementById('formTitle').innerText = "新規ガチャボタン作成";
        document.getElementById('submitBtn').innerText = "ボタンを作成";
        document.getElementById('submitBtn').classList.remove('btn-action');
        alert('変更内容を上書き保存しました！');
    }

    localStorage.setItem('user_created_buttons', JSON.stringify(localButtons));
    resetForm();
    window.refreshButtonList();
};

// シェア専用のポップアップを開く
window.openShareModal = function(name, optionsJsonStr) {
    window.playClickSound();
    const options = JSON.parse(decodeURIComponent(optionsJsonStr));
    const uniqueButtonUrl = generateButtonUrl(name, options);

    const text = `「${name}」というオリジナルガチャボタンを作ったよ！\nみんなもここから回してみてね！\n\n#UniqueButtonMaker #128bitApps\n\n製作者:@128bit_VideoApp ${uniqueButtonUrl}`;
    
    document.getElementById('generatedUrlInput').value = uniqueButtonUrl;
    document.getElementById('shareFormXLink').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    document.getElementById('shareModalOverlay').style.display = "flex";
};

window.closeShareModal = function() {
    window.playClickSound();
    document.getElementById('shareModalOverlay').style.display = "none";
};

window.copyShareUrl = function() {
    window.playClickSound();
    const copyTarget = document.getElementById('generatedUrlInput');
    copyTarget.select();
    navigator.clipboard.writeText(copyTarget.value).then(() => {
        alert('共有リンクをクリップボードにコピーしました！');
    }).catch(() => {
        alert('コピーに失敗しました。枠内の文字を手動でコピーしてください。');
    });
};

function resetForm() {
    document.getElementById('btnName').value = "";
    document.getElementById('optionsGroup').innerHTML = `
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 1"></div>
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 2"></div>
    `;
}

window.refreshButtonList = function() {
    const container = document.getElementById('buttonListContainer');
    container.innerHTML = "";
    PRESET_BUTTONS.forEach(btn => {
        renderItemRow(container, btn.name, btn.options, false, null);
    });
    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    localButtons.forEach((btn, i) => {
        renderItemRow(container, btn.name, btn.options, true, i);
    });
};

function renderItemRow(container, name, options, isUserCreated, localIndex) {
    const item = document.createElement('div');
    item.className = 'list-item-btn';
    const preview = options.join(', ');
    const optionsJsonStr = encodeURIComponent(JSON.stringify(options));

    let actionHtml = "";
    if (!isUserCreated) {
        actionHtml = `
            <button class="btn-play-list" onclick="window.selectButton('${name}', JSON.parse(decodeURIComponent('${optionsJsonStr}')))">回す</button>
            <button class="btn-share-list" onclick="window.openShareModal('${name}', '${optionsJsonStr}')">シェア</button>
            <div class="badge-preset">おすすめ</div>
        `;
    } else {
        actionHtml = `
            <button class="btn-play-list" onclick="window.selectButton('${name}', JSON.parse(decodeURIComponent('${optionsJsonStr}')))">回す</button>
            <button class="btn-share-list" onclick="window.openShareModal('${name}', '${optionsJsonStr}')">シェア</button>
            <button class="btn-edit" onclick="window.startEdit('${localIndex}')">編集</button>
            <button class="btn-delete" onclick="window.startDelete('${localIndex}')">削除</button>
        `;
    }

    item.innerHTML = `
        <div class="list-clickable-area" onclick="window.selectButton('${name}', JSON.parse(decodeURIComponent('${optionsJsonStr}')))">
            <div class="list-info">
                ${name}
                <span>選択肢: ${preview}</span>
            </div>
        </div>
        <div class="list-actions">${actionHtml}</div>
    `;
    container.appendChild(item);
}

window.startEdit = function(localIndex) {
    window.playClickSound();
    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    const btn = localButtons[parseInt(localIndex)];
    if (!btn) return;

    document.getElementById('editIndex').value = localIndex;
    document.getElementById('btnName').value = btn.name;
    document.getElementById('formTitle').innerText = "ボタンの内容を編集中";
    document.getElementById('submitBtn').innerText = "修正内容を上書き保存する";
    document.getElementById('submitBtn').classList.add('btn-action');

    const group = document.getElementById('optionsGroup');
    group.innerHTML = "";
    btn.options.forEach((opt, i) => {
        const newItem = document.createElement('div');
        newItem.className = 'option-item';
        newItem.innerHTML = `<input type="text" class="roulette-option-input" value="${opt}" placeholder="選択肢 ${i + 1}">`;
        group.appendChild(newItem);
    });
    document.getElementById('creatorArea').scrollIntoView({ behavior: 'smooth' });
};

window.startDelete = function(localIndex) {
    window.playClickSound();
    if (!confirm("本当にこのボタンを削除しますか？")) return;
    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    localButtons.splice(parseInt(localIndex), 1);
    localStorage.setItem('user_created_buttons', JSON.stringify(localButtons));
    window.refreshButtonList();
};

window.selectButton = function(name, options) {
    window.playClickSound();
    currentButtonData = { name: name, options: options };
    document.getElementById('playingTitle').innerText = `「${name}」をプレイ中`;
    document.getElementById('targetButton').innerText = name;
    const playArea = document.getElementById('activePlayArea');
    if (playArea && options && options.length >= 2) {
        playArea.style.display = "block";
        document.getElementById('creatorArea').style.display = "none";
        document.getElementById('listArea').style.display = "none";
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
};

window.closePlayArea = function() {
    window.playClickSound();
    document.getElementById('activePlayArea').style.display = "none";
    document.getElementById('creatorArea').style.display = "block";
    document.getElementById('listArea').style.display = "block";
};

window.startRouletteOverlay = function() {
    if (!currentButtonData.options || currentButtonData.options.length < 2) {
        alert("ボタンが選択されていません。");
        return;
    }
    window.playClickSound();
    document.getElementById('rouletteOverlay').style.display = "flex";
    document.getElementById('rouletteTitle').innerText = currentButtonData.name;
    document.getElementById('resultOutput').innerText = "- - -";
    document.getElementById('spinBtn').style.display = "block";
    document.getElementById('twitterLink').style.display = "none";
    document.getElementById('closeBtn').style.display = "none";
    drawRouletteWheel();
};

window.closeOverlay = function() { window.playClickSound(); document.getElementById('rouletteOverlay').style.display = "none"; };

function drawRouletteWheel() {
    const canvas = document.getElementById("wheelCanvas");
    if (canvas && canvas.getContext) {
        const len = currentButtonData.options.length;
        arc = Math.PI / (len / 2);
        ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,300,300);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        for(let i = 0; i < len; i++) {
            const angle = startAngle + i * arc;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath(); ctx.moveTo(150, 150); ctx.arc(150, 150, 140, angle, angle + arc, false); ctx.lineTo(150, 150); ctx.fill(); ctx.stroke();
            ctx.save(); ctx.fillStyle = "#ffffff"; ctx.font = "bold 13px sans-serif";
            ctx.translate(150 + Math.cos(angle + arc / 2) * 85, 150 + Math.sin(angle + arc / 2) * 85); ctx.rotate(angle + arc / 2 + Math.PI / 2);
            const text = currentButtonData.options[i];
            ctx.fillText(text.length > 8 ? text.substring(0,7)+".." : text, -ctx.measureText(text).width / 2, 0); ctx.restore();
        }
    }
}

window.spinWheel = function() {
    window.playClickSound(); document.getElementById('spinBtn').style.display = "none";
    spinAngleStart = Math.random() * 10 + 12; spinTime = 0; spinTimeTotal = Math.random() * 2000 + 4000;
    lastTargetIndex = -1; rotateWheel();
};

function rotateWheel() {
    spinTime += 30; if(spinTime >= spinTimeTotal) { stopRotateWheel(); return; }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180); drawRouletteWheel();
    const len = currentButtonData.options.length;
    const degrees = startAngle * 180 / Math.PI + 90; const arcd = arc * 180 / Math.PI;
    const currentIndex = Math.floor((360 - (degrees % 360)) / arcd) % len;
    const finalCurrentIndex = currentIndex < 0 ? currentIndex + len : currentIndex;
    if (finalCurrentIndex !== lastTargetIndex) { playTickSound(); lastTargetIndex = finalCurrentIndex; }
    spinTimeout = setTimeout(rotateWheel, 30);
}

function stopRotateWheel() {
    clearTimeout(spinTimeout);
    const len = currentButtonData.options.length;
    const degrees = startAngle * 180 / Math.PI + 90; const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd) % len;
    const finalIndex = index < 0 ? index + len : index; const resultText = currentButtonData.options[finalIndex];
    document.getElementById('resultOutput').innerHTML = `【 ${resultText} 】に決定！`;
    
    playCuteTone(523.25, 0.2, 0.1, 'sine'); setTimeout(() => playCuteTone(659.25, 0.2, 0.1, 'sine'), 80);
    setTimeout(() => playCuteTone(783.99, 0.2, 0.1, 'sine'), 160); setTimeout(() => playCuteTone(1046.50, 0.2, 0.1, 'sine'), 240);
    setTimeout(() => { playCuteTone(1318.51, 0.5, 0.08, 'sine'); playCuteTone(1046.50, 0.5, 0.08, 'sine'); }, 320);
    
    confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => { confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }); }, 250);
    setupTwitterButton(resultText);
}

function easeOut(t, b, c, d) { const ts = (t /= d) * t; const tc = ts * t; return b + c * (tc + -3 * ts + 3 * t); }

function setupTwitterButton(result) {
    const tweetBtn = document.getElementById('twitterLink'); 
    const closeBtn = document.getElementById('closeBtn');
    
    const dataObj = { n: currentButtonData.name, o: currentButtonData.options };
    const jsonStr = unescape(encodeURIComponent(JSON.stringify(dataObj)));
    const base64 = btoa(jsonStr);
    const safeBase64 = base64.replace(/=/g, '%3D');
    const uniqueButtonUrl = `https://128bit-m4.github.io/color-unique-tweetbutton/?b=${safeBase64}`;
    
    const text = `「${currentButtonData.name}」のルーレット結果：【 ${result} 】\n\n#UniqueButtonMaker #128bitApps\n\n製作者:@128bit_VideoApp ${uniqueButtonUrl}`;
    
    tweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    tweetBtn.style.display = "block"; 
    closeBtn.style.display = "block";
}
