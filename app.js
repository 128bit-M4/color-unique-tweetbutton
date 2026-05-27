// 🎁 固定おすすめプリセット（初期ボタン）
const PRESET_BUTTONS = [
    { name: "今日の晩ごはん決定ボタン", options: ["ラーメン", "カレーライス", "ハンバーグ", "お寿司", "パスタ", "うどん"] },
    { name: "作業用BGMジャンル抽選器", options: ["Vocaloid", "Lo-Fi HipHop", "Synthwave", "Game Soundtrack", "J-POP"] },
    { name: "次の休み中にやること", options: ["ゲームに没頭する", "コードを改造する", "部屋の模様替え", "一日中寝る", "映画を観る"] }
];

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

/* --- 可愛い効果音シンセエンジン --- */
function initAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playCuteTone(frequency, duration, volume = 0.1, type = 'sine') {
    if (!isSoundEnabled || !audioCtx) return;
    try {
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
    initAudioContext();
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
    window.playClickSound();
    window.initAudio(!isSoundEnabled);
};

/* --- 🌟 データ暗号化・URL生成ロジック --- */

// ボタンのオブジェクトデータを、URLに載せられる安全な文字列に変換する関数
function generateButtonUrl(name, options) {
    const dataObj = { n: name, o: options };
    // 日本語（UTF-8）を壊さずにBase64変換するための処理
    const jsonStr = unescape(encodeURIComponent(JSON.stringify(dataObj)));
    const base64 = btoa(jsonStr);
    
    const baseUrl = "https://128bit-m4.github.io/color-unique-tweetbutton/";
    return `${baseUrl}?b=${base64}`;
}

// URLパラメータからデータを読み込んで復元する関数
function loadButtonFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const base64Data = urlParams.get('b');
    if (!base64Data) return null;

    try {
        const jsonStr = decodeURIComponent(escape(atob(base64Data)));
        const decoded = JSON.parse(jsonStr);
        return {
            name: decoded.n,
            options: decoded.o
        };
    } catch (e) {
        console.error("URLデータの解析に失敗しました", e);
        return null;
    }
}

/* --- アプリの起動時セットアップ --- */
window.addEventListener('DOMContentLoaded', () => {
    // 🛡️ リロード直後は確実にプレイエリアを非表示にする
    const playArea = document.getElementById('activePlayArea');
    if (playArea) {
        playArea.style.setProperty('display', 'none', 'important');
    }

    // 🌟 リンク共有からアクセスされたかチェック
    const sharedButton = loadButtonFromUrl();
    if (sharedButton) {
        // 共有されたボタンがある場合、それを自動でローカルストレージ（マイボタン）に保存して即プレイ開始
        let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
        
        // 重複チェック（同じ名前のボタンがすでになければ追加）
        if (!localButtons.some(b => b.name === sharedButton.name)) {
            localButtons.push(sharedButton);
            localStorage.setItem('user_created_buttons', JSON.stringify(localButtons));
        }
        
        // 即選択状態にする
        window.selectButton(sharedButton.name, sharedButton.options);
    }

    window.refreshButtonList();
});

/* --- ガチャボタン作成 ＆ 編集 --- */
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

window.createNewButton = function() {
    window.playClickSound();
    const name = document.getElementById('btnName').value.trim();
    const inputElements = document.getElementsByClassName('roulette-option-input');
    const privacy = document.querySelector('input[name="btnPrivacy"]:checked').value;
    const editIndex = parseInt(document.getElementById('editIndex').value);

    let options = [];
    for (let input of inputElements) {
        const val = input.value.trim();
        if (val !== "") options.push(val);
    }

    if (!name) { alert('ボタン名を入力してください。'); return; }
    if (options.length < 2) { alert('選択肢を2つ以上入力してください。'); return; }

    // ボタンの専用共有リンクを生成
    const uniqueButtonUrl = generateButtonUrl(name, options);

    if (privacy === "share") {
        // 【Xで共有モード】：生成した「そのボタン専用のURL」をツイートに埋め込む
        const text = `「${name}」というオリジナルガチャボタンを作ったよ！\nみんなもここから回してみてね！\n\n#UniqueButtonMaker #128bitApps\n\n製作者:@128bit_VideoApp`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(uniqueButtonUrl)}`;
        
        alert('作成したボタンリンクをシェアするために、X（Twitter）の投稿画面を開きます！');
        window.open(shareUrl, '_blank');
    }

    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    
    if (editIndex === -1) {
        localButtons.push({ name: name, options: options });
    } else {
        localButtons[editIndex] = { name: name, options: options };
        document.getElementById('editIndex').value = "-1";
        document.getElementById('formTitle').innerText = "新規ガチャボタン作成";
        document.getElementById('submitBtn').innerText = "ボタンを作成";
        document.getElementById('submitBtn').classList.remove('btn-action');
    }

    localStorage.setItem('user_created_buttons', JSON.stringify(localButtons));
    resetForm();
    window.refreshButtonList();
};

function resetForm() {
    document.getElementById('btnName').value = "";
    document.getElementById('optionsGroup').innerHTML = `
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 1"></div>
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 2"></div>
    `;
}

/* --- ボタンリストの描画 --- */
window.refreshButtonList = function() {
    const container = document.getElementById('buttonListContainer');
    container.innerHTML = "";

    PRESET_BUTTONS.forEach(btn => {
        renderItemRow(container, btn.name, btn.options, "おすすめ", "badge-preset", null);
    });

    let localButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    localButtons.forEach((btn, i) => {
        renderItemRow(container, btn.name, btn.options, "マイボタン", "badge-user", i);
    });
};

function renderItemRow(container, name, options, badgeText, badgeClass, localIndex) {
    const item = document.createElement('div');
    item.className = 'list-item-btn';
    const preview = options.join(', ');
    
    let actionHtml = `<div class="${badgeClass}">${badgeText}</div>`;
    
    if (localIndex !== null) {
        actionHtml = `
            <button class="btn-edit" onclick="window.startEdit('${localIndex}')">編集</button>
            <button class="btn-delete" onclick="window.startDelete('${localIndex}')">削除</button>
        `;
    }

    item.innerHTML = `
        <div class="list-clickable-area">
            <div class="list-info">
                ${name}
                <span>選択肢: ${preview.substring(0, 35)}${preview.length > 35 ? '...':''}</span>
            </div>
        </div>
        <div class="list-actions">${actionHtml}</div>
    `;

    item.querySelector('.list-clickable-area').onclick = () => {
        window.selectButton(name, options);
    };
    container.appendChild(item);
}

/* --- 編集・削除 --- */
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

/* --- 選択時のみ表示するプレイエリア --- */
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

window.closeOverlay = function() {
    window.playClickSound();
    document.getElementById('rouletteOverlay').style.display = "none";
};

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

window.spinWheel = function() {
    window.playClickSound();
    document.getElementById('spinBtn').style.display = "none";
    spinAngleStart = Math.random() * 10 + 12;
    spinTime = 0;
    spinTimeTotal = Math.random() * 2000 + 4000;
    
    lastTargetIndex = -1;
    rotateWheel();
};

function rotateWheel() {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) { stopRotateWheel(); return; }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();

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

    if (isSoundEnabled) {
        playCuteTone(523.25, 0.2, 0.1, 'sine');
        setTimeout(() => playCuteTone(659.25, 0.2, 0.1, 'sine'), 80);
        setTimeout(() => playCuteTone(783.99, 0.2, 0.1, 'sine'), 160);
        setTimeout(() => playCuteTone(1046.50, 0.2, 0.1, 'sine'), 240);
        setTimeout(() => {
            playCuteTone(1318.51, 0.5, 0.08, 'sine');
            playCuteTone(1046.50, 0.5, 0.08, 'sine');
        }, 320);
    }

    confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => { confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }); }, 250);

    setupTwitterButton(resultText);
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t; const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

// 🎯 ルーレット結果をツイートする用（固定URLのまま）
function setupTwitterButton(result) {
    const tweetBtn = document.getElementById('twitterLink');
    const closeBtn = document.getElementById('closeBtn');
    
    const text = `「${currentButtonData.name}」のルーレット結果：【 ${result} 】\n\n#UniqueButtonMaker #128bitApps\n\n製作者:@128bit_VideoApp`;
    const pageUrl = "https://128bit-m4.github.io/color-unique-tweetbutton/";

    tweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    tweetBtn.style.display = "block";
    closeBtn.style.display = "block";
}
