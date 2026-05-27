// 🎁 最初から入っているおすすめボタンのリスト（ここに好きなだけ追加できます！）
const PRESET_BUTTONS = [
    { name: "今日の晩ごはん決定ボタン", options: ["ラーメン", "カレーライス", "ハンバーグ", "お寿司", "パスタ", "うどん"] },
    { name: "作業用BGMジャンル抽選器", options: ["Vocaloid", "Lo-Fi HipHop", "Synthwave", "Game Soundtrack", "J-POP"] },
    { name: "次の休み中にやること", options: ["ゲームに没頭する", "コードを改造する", "部屋の模様替え", "一日中寝る", "映画を観る"] }
];

let currentButtonData = { name: "", options: [] };
const colors = ["#ff758c", "#4dd0e1", "#ffb74d", "#81c784", "#9575cd", "#4fc3f7", "#a1887f", "#f06292"];
let startAngle = 0;
let arc = 0;
let spinTimeout = null;
let spinAngleStart = 10;
let spinTime = 0;
let spinTimeTotal = 0;
let ctx;

// 起動時にリストを表示
window.addEventListener('DOMContentLoaded', () => {
    renderButtonList();
});

// 入力欄を増やす処理
function addOptionField() {
    const group = document.getElementById('optionsGroup');
    const currentCount = group.getElementsByClassName('option-item').length;
    if (currentCount >= 12) { alert('選択肢は最大12個までです。'); return; }

    const newItem = document.createElement('div');
    newItem.className = 'option-item';
    newItem.innerHTML = `<input type="text" class="roulette-option-input" placeholder="選択肢 ${currentCount + 1}">`;
    group.appendChild(newItem);
    newItem.querySelector('input').focus();
}

// ボタンを新しく作成（ローカルに保存）
function createNewButton() {
    const name = document.getElementById('btnName').value.trim();
    const inputElements = document.getElementsByClassName('roulette-option-input');
    let options = [];
    
    for (let input of inputElements) {
        const val = input.value.trim();
        if (val !== "") options.push(val);
    }

    if (!name) { alert('ボタン名を入力してください。'); return; }
    if (options.length < 2) { alert('選択肢を2つ以上入力してください。'); return; }

    // ブラウザの保存領域（LocalStorage）から今までの自作ボタンを読み込む
    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    
    // 新しいボタンを追加
    userButtons.push({ name: name, options: options });
    
    // 再度保存
    localStorage.setItem('user_created_buttons', JSON.stringify(userButtons));

    alert('マイボタンを作成しました！');
    
    // フォームリセット
    document.getElementById('btnName').value = "";
    document.getElementById('optionsGroup').innerHTML = `
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 1"></div>
        <div class="option-item"><input type="text" class="roulette-option-input" placeholder="選択肢 2"></div>
    `;
    
    renderButtonList();
}

// 画面にすべてのボタン（プリセット＋自作）を描画する
function renderButtonList() {
    const container = document.getElementById('buttonListContainer');
    container.innerHTML = "";

    // 1. プリセットボタンを描画
    PRESET_BUTTONS.forEach(btn => {
        createListItem(container, btn, "おすすめ", "badge-preset");
    });

    // 2. ユーザーが作ったボタンをLocalStorageから読み込んで描画
    let userButtons = JSON.parse(localStorage.getItem('user_created_buttons')) || [];
    userButtons.forEach(btn => {
        createListItem(container, btn, "マイボタン", "badge-user");
    });
}

function createListItem(container, btn, badgeText, badgeClass) {
    const item = document.createElement('div');
    item.className = 'list-item-btn';
    const preview = btn.options.join(', ');
    
    item.innerHTML = `
        <div class="list-info">
            ${btn.name}
            <span>選択肢: ${preview.substring(0, 35)}${preview.length > 35 ? '...':''}</span>
        </div>
        <div class="${badgeClass}">${badgeText}</div>
    `;
    item.onclick = () => { selectButton(btn.name, btn.options); };
    container.appendChild(item);
}

function selectButton(name, options) {
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
    document.getElementById('activePlayArea').style.display = "none";
    document.getElementById('creatorArea').style.display = "block";
    document.getElementById('listArea').style.display = "block";
}

/* --- ルーレット & 演出ロジック --- */
function startRouletteOverlay() {
    document.getElementById('rouletteOverlay').style.display = "flex";
    document.getElementById('rouletteTitle').innerText = currentButtonData.name;
    document.getElementById('resultOutput').innerText = "- - -";
    document.getElementById('spinBtn').style.display = "block";
    document.getElementById('twitterLink').style.display = "none";
    document.getElementById('closeBtn').style.display = "none";
    drawRouletteWheel();
}

function closeOverlay() { document.getElementById('rouletteOverlay').style.display = "none"; }

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
    document.getElementById('spinBtn').style.display = "none";
    spinAngleStart = Math.random() * 10 + 10;
    spinTime = 0;
    spinTimeTotal = Math.random() * 2000 + 3500;
    rotateWheel();
}

function rotateWheel() {
    spinTime += 30;
    if(spinTime >= spinTimeTotal) { stopRotateWheel(); return; }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawRouletteWheel();
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

    // 派手な紙吹雪演出
    confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => { confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }); }, 250);

    setupTwitterButton(resultText);
}

function easeOut(t, b, c, d) {
    const ts = (t /= d) * t; const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
}

function setupTwitterButton(result) {
    const tweetBtn = document.getElementById('twitterLink');
    const closeBtn = document.getElementById('closeBtn');
    const text = `「${currentButtonData.name}」のルーレット結果：【 ${result} 】\n\n#UniqueButtonMaker`;
    const pageUrl = window.location.href;
    tweetBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`;
    tweetBtn.style.display = "block";
    closeBtn.style.display = "block";
}
