// Firebase SDKから必要なモジュールをインポート (提供されたv12.13.0に準拠)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, increment, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// あなたのFirebaseプロジェクトの設定情報
const firebaseConfig = {
    apiKey: "AIzaSyDdaz018VNdgmwa6n3nihZ33glKadkgCLQ",
    authDomain: "my-btn-maker.firebaseapp.com",
    projectId: "my-btn-maker",
    storageBucket: "my-btn-maker.firebasestorage.app",
    messagingSenderId: "88049757813",
    appId: "1:88049757813:web:7c400d48972825a634123c",
    measurementId: "G-06VGJ5R6H5"
};

// FirebaseおよびFirestoreの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. ボタンデータをFirestoreに保存する関数
window.saveButtonToFirebase = async function(name, options) {
    try {
        await addDoc(collection(db, "buttons"), {
            name: name,
            options: options,
            playCount: 0, // プレイ回数の初期値
            createdAt: new Date() // 作成日時
        });
        // データを新しく作った時は、ローカルの古いキャッシュを削除
        localStorage.removeItem('cached_buttons_new');
        localStorage.removeItem('cached_buttons_popular');
        return true;
    } catch (e) {
        console.error("Error adding document: ", e);
        return false;
    }
};

// 2. ルーレットが回った時にプレイ回数を+1する関数
window.incrementPlayCount = async function(docId) {
    if (!docId) return;
    try {
        const buttonRef = doc(db, "buttons", docId);
        await updateDoc(buttonRef, {
            playCount: increment(1) // サーバー側で安全に+1
        });
        // 回数が更新されたので、キャッシュを削除して次回最新にする
        localStorage.removeItem('cached_buttons_new');
        localStorage.removeItem('cached_buttons_popular');
    } catch (e) {
        console.error("Error incrementing play count: ", e);
    }
};

// 3. データを読み込む関数 (新着順／人気順対応 ＆ 3分間のキャッシュ機能付き)
window.loadButtonsFromFirebase = async function(orderType = 'new', forceRefresh = false) {
    const CACHE_KEY = `cached_buttons_${orderType}`;
    const CACHE_TIME_KEY = `cached_buttons_time_${orderType}`;
    const CACHE_DURATION = 3 * 60 * 1000; // 3分間キャッシュ（ミリ秒）

    const now = Date.now();
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    // 強制更新でなく、キャッシュが3分以内ならFirebaseを叩かずにローカルデータを返す（回数節約）
    if (!forceRefresh && cachedData && cachedTime && (now - cachedTime < CACHE_DURATION)) {
        return JSON.parse(cachedData);
    }

    try {
        // 並び替え基準の設定（人気順ならplayCount、新着順ならcreatedAt）
        const orderField = orderType === 'popular' ? 'playCount' : 'createdAt';
        const q = query(collection(db, "buttons"), orderBy(orderField, "desc"), limit(30));
        
        const querySnapshot = await getDocs(q);
        let buttons = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = doc.id; // ドキュメント固有のIDを取得（カウンターで使用）
            buttons.push(data);
        });

        // 取得データをブラウザにキャッシュ保存
        localStorage.setItem(CACHE_KEY, JSON.stringify(buttons));
        localStorage.setItem(CACHE_TIME_KEY, now.toString());
        return buttons;
    } catch (e) {
        console.error("Error getting documents: ", e);
        return [];
    }
};
