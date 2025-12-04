import React, { useState, useEffect } from 'react';
import './App.css';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

function App() {
  // --- حالة المستخدم (User State) ---
  const [user, setUser] = useState(null); // هل فيه مستخدم ولا لأ؟
  const [loading, setLoading] = useState(true); // هل بنحمل البيانات؟
  
  // متغيرات الدخول والتسجيل
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // هل هو تسجيل جديد؟
  const [gender, setGender] = useState('male'); // النوع (ذكر/أنثى)
  const [error, setError] = useState('');

  // --- متغيرات التطبيق الأساسية ---
  const [activeTab, setActiveTab] = useState('home');
  const [xp, setXp] = useState(300);
  const [level, setLevel] = useState(1);
  
  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // إعدادات
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // الأذكار
  const [currentAthkar, setCurrentAthkar] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [hijriDate, setHijriDate] = useState('');
  const [quranSurahs, setQuranSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(null);
  const [dailyHadith, setDailyHadith] = useState('');

  // 1. مخزن عداد السبحة
  const [tasbeehCount, setTasbeehCount] = useState(0);

  // مخزن لعدد صفحات القرآن اللي المستخدم هيكتبها
  const [quranPages, setQuranPages] = useState('');

  // 3. قائمة المهام اليومية (الداتا بتاعتنا)
  const defaultTasks = [
    { id: 1, title: 'تجديد العهد (الشهادة)', xp: 500, completed: false, icon: '☀️' },
    { id: 2, title: 'صلاة الفجر', xp: 100, completed: false, icon: '🕌' },
    { id: 3, title: 'أذكار الصباح', xp: 200, completed: false, icon: '📿' },
    { id: 4, title: 'صلاة الظهر', xp: 100, completed: false, icon: '🕌' },
    { id: 5, title: 'صلاة العصر', xp: 100, completed: false, icon: '🕌' },
    { id: 6, title: 'صلاة المغرب', xp: 100, completed: false, icon: '🕌' },
    { id: 7, title: 'صلاة العشاء', xp: 100, completed: false, icon: '🕌' },
    { id: 8, title: 'ورد الاستغفار (100 مرة)', xp: 150, completed: false, icon: '🤲' },
  ];
  const [tasks, setTasks] = useState(defaultTasks);

  // حفظ Dark Mode في localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // 1. مراقبة حالة الدخول (أول ما الموقع يفتح)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // لو دخل، هات بياناته من الداتابيس
        await loadUserData(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. تحميل بيانات المستخدم من Firestore
  const loadUserData = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setXp(data.xp || 0);
      setLevel(data.level || 1);
      // نقرأ النوع عشان نغير الأيقونات
      if (data.gender) setGender(data.gender);
      if (data.tasks) setTasks(data.tasks);
    } else {
      // مستخدم جديد في الداتابيس
      await setDoc(docRef, { xp: 300, level: 1, gender: gender, tasks: defaultTasks });
    }
  };

  // 3. حفظ البيانات (تحديث)
  const saveProgress = async (newXp, newLevel, newTasks) => {
    if (user) {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { xp: newXp, level: newLevel, tasks: newTasks });
    }
  };

  // 4. دالة الدخول / التسجيل
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        // إنشاء حساب جديد
        const res = await createUserWithEmailAndPassword(auth, email, password);
        // إنشاء ملف في الداتابيس
        await setDoc(doc(db, "users", res.user.uid), {
          email: email,
          gender: gender,
          xp: 300,
          level: 1,
          tasks: defaultTasks
        });
      } else {
        // تسجيل دخول
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError("خطأ: " + err.message);
    }
  };

  // دالة جلب الأذكار
  const getAthkarList = (type) => {
    const athkar = {
      morning: [
        { text: 'أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ', count: 'مرة واحدة', source: 'قبل قراءة القرآن' },
        { text: 'اللَّهُمَّ أَصْبَحْنَا نُشْهِدُكَ وَنُشْهِدُ حَمَلَةَ عَرْشِكَ...', count: 'مرة واحدة', source: 'صحيح' },
        { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 'مائة مرة', source: 'صحيح مسلم' },
        { text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ...', count: 'عشر مرات', source: 'صحيح' },
      ],
      evening: [
        { text: 'أَعُوذُ بِاللهِ مِنْ الشَّيْطَانِ الرَّجِيمِ', count: 'مرة واحدة', source: 'قبل قراءة القرآن' },
        { text: 'اللَّهُمَّ أَمْسَيْنَا نُشْهِدُكَ وَنُشْهِدُ حَمَلَةَ عَرْشِكَ...', count: 'مرة واحدة', source: 'صحيح' },
        { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 'مائة مرة', source: 'صحيح مسلم' },
        { text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ...', count: 'عشر مرات', source: 'صحيح' },
      ],
      sleep: [
        { text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي...', count: 'مرة واحدة', source: 'صحيح البخاري' },
        { text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', count: 'ثلاث مرات', source: 'صحيح' },
        { text: 'سُبْحَانَ اللَّهِ', count: 'ثلاث وثلاثون مرة', source: 'صحيح البخاري' },
      ],
      mosque: [
        { text: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ', count: 'عند الدخول', source: 'صحيح مسلم' },
        { text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ', count: 'عند الخروج', source: 'صحيح مسلم' },
        { text: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ...', count: 'عند الجلوس', source: 'صحيح' },
      ],
    };
    return athkar[type] || [];
  };

  // دالة إظهار الفائدة
  const showWhy = (taskTitle) => {
    let message = "";
    if (taskTitle.includes("صلاة")) {
      message = "قال ﷺ: «أَوَّلُ ما يُحاسَبُ بهِ العَبْدُ يَومَ القِيامَةِ الصَّلاةُ» 🕌";
    } else if (taskTitle.includes("العهد")) {
      message = "قال ﷺ: «مَنْ قَالَ: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ... كَتَبَ اللَّهُ لَهُ مِائَةَ حَسَنَةٍ» ☀️";
    } else if (taskTitle.includes("استغفار")) {
      message = "قال تعالى: ﴿فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا﴾ 🤲";
    } else {
      message = "قال تعالى: ﴿وَافْعَلُوا الْخَيْرَ لَعَلَّكُمْ تُفْلِحُونَ﴾ ✨";
    }
    alert(message); // ممكن نغيرها لشكل أحلى بعدين
  };

  // 5. إنجاز المهمة (مربوطة بـ Firebase)
  const completeTask = (id, reward) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);
    
    const newXp = xp + reward;
    setXp(newXp);
    let newLevel = level;
    if (newXp >= level * 1000) {
        newLevel = level + 1;
        alert("🎉 مبروك! لقد ارتقيت لمستوى جديد!");
        setLevel(newLevel);
    }
    // حفظ في السحاب
    saveProgress(newXp, newLevel, updatedTasks);
  };

  // إلغاء إنجاز المهمة (خصم الحسنات)
  const uncompleteTask = (id, reward) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: false } : task
    );
    setTasks(updatedTasks);
    
    const newXp = Math.max(0, xp - reward);
    setXp(newXp);
    // حفظ في السحاب
    saveProgress(newXp, level, updatedTasks);
  };

  // 2. دالة التسبيح
  const incrementTasbeeh = () => {
    setTasbeehCount(tasbeehCount + 1);
    // معلومة للمبرمج: في المستقبل ممكن نربط ده بـ API الاهتزاز (Vibration)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  // 3. تصفير العداد
  const resetTasbeeh = () => {
    if (window.confirm('هل تريد تصفير العداد؟')) {
      setTasbeehCount(0);
    }
  };

  // دالة تسجيل قراءة القرآن (مربوطة بـ Firebase)
  const logQuran = () => {
    const pages = parseInt(quranPages);
    if (!pages || pages <= 0) {
      alert("من فضلك أدخل رقم صحيح");
      return;
    }
    
    const reward = pages * 500;
    const newXp = xp + reward;
    setXp(newXp);
    setQuranPages('');
    alert(`تقبل الله! تمت إضافة ${reward} حسنة لرصيدك 🤲`);
    
    let newLevel = level;
    const xpForNextLevel = level * 1000;
    if (newXp >= xpForNextLevel) {
      newLevel = level + 1;
      setLevel(newLevel);
      alert("🎉 مبروك! لقد ارتقيت لمستوى جديد!");
    }
    // حفظ في السحاب
    saveProgress(newXp, newLevel, tasks);
  };

  // --- واجهة تسجيل الدخول ---
  if (loading) return <div className="loading">جاري التحميل... ⏳</div>;

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h1>
          <p>أهلاً بك في رحلة "الطريق الصحيح" 🌿</p>
          
          <form onSubmit={handleAuth}>
            <input 
              type="email" placeholder="البريد الإلكتروني" 
              value={email} onChange={e => setEmail(e.target.value)} required 
            />
            <input 
              type="password" placeholder="كلمة المرور" 
              value={password} onChange={e => setPassword(e.target.value)} required 
            />
            
            {isSignUp && (
              <div className="gender-select">
                <label>
                  <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} />
                  ذكر 👨
                </label>
                <label>
                  <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => setGender('female')} />
                  أنثى 🧕
                </label>
              </div>
            )}
            {error && <p className="error-msg">{error}</p>}
            
            <button type="submit" className="auth-btn">
              {isSignUp ? 'ابدأ الرحلة 🚀' : 'دخول 🔑'}
            </button>
          </form>
          <p className="toggle-auth" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ أنشئ حساب جديد'}
          </p>
        </div>
      </div>
    );
  }

  // --- التطبيق الأساسي (لو المستخدم مسجل) ---
  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
        // 5. هنا حولنا الـ Placeholder لقائمة حقيقية
        <div className="tasks-list">
          <div className="home-header">
            <h3>مهام اليوم 📅</h3>
            {hijriDate && (
              <div className="hijri-date">
                <span>📆 {hijriDate}</span>
              </div>
            )}
            {dailyHadith && (
              <div className="daily-hadith">
                <p className="hadith-text">{dailyHadith}</p>
              </div>
            )}
          </div>
          {tasks.map(task => (
            <div 
              key={task.id} 
              className={`task-card ${task.completed ? 'completed' : ''}`}
            >
              
              {/* الجزء اليمين: الأيقونة والعنوان */}
              <div className="task-info" onClick={() => !task.completed && completeTask(task.id, task.xp)}>
                <span className="task-icon">
                  {/* لو الصلاة والنوع أنثى حط بيت، لو ذكر حط جامع */}
                  {task.title.includes('صلاة') && gender === 'female' ? '🏠' : task.icon}
                </span>
                <div>
                  <span className="task-title">{task.title}</span>
                  {task.time && (
                    <span className="task-time">⏰ {task.time}</span>
                  )}
                </div>
              </div>

              {/* الجزء الشمال: الفائدة والتشيك */}
              <div className="task-action">
                {/* زرار اللمبة (الفائدة) */}
                <button 
                  className="why-btn" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    showWhy(task.title); 
                  }}
                  title="لماذا هذه المهمة مهمة؟"
                >
                  💡
                </button>
                
                <span className="task-xp">+{task.xp} حسنة</span>
                <div onClick={(e) => {
                  e.stopPropagation();
                  if (task.completed) {
                    uncompleteTask(task.id, task.xp);
                  } else {
                    completeTask(task.id, task.xp);
                  }
                }}>
                  {task.completed ? (
                    <span className="task-check" title="اضغط لإلغاء التحديد">✅</span>
                  ) : (
                    <span className="task-circle">⭕</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
      case 'journey': return (
        <div className="journey-container">
          
          {/* 1. قسم اللقب الحالي والتالي */}
          <div className="level-card">
            <div className="level-header">
              <span className="level-number">مستوى {level}</span>
              <span className="level-status">اللقب الحالي</span>
            </div>
            <h2>باحث عن الخير 🧭</h2>
            <div className="next-level-info">
              <p>اللقب القادم: <strong>مُلتزم 🕌</strong></p>
              <div className="level-progress-bg">
                <div className="level-progress-fill" style={{ width: `${Math.min(((xp % (level * 1000)) / (level * 1000)) * 100, 100)}%` }}></div>
              </div>
              <p className="small-text">باقي {Math.max(0, (level * 1000) - (xp % (level * 1000)))} حسنة للترقية</p>
            </div>
          </div>

          {/* 2. قسم البادجات (الجوائز) */}
          <h3 className="section-title">إنجازاتك 🏆</h3>
          <div className="badges-grid">
            {/* بادج 1: البداية (مفتوح دائماً) */}
            <div className="badge-item unlocked">
              <div className="badge-icon">⭐</div>
              <span>بداية الطريق</span>
            </div>

            {/* بادج 2: مستوى 2 (يفتح لما توصل مستوى 2) */}
            <div className={`badge-item ${level >= 2 ? 'unlocked' : 'locked'}`}>
              <div className="badge-icon">{level >= 2 ? '🏆' : '🔒'}</div>
              <span>أول ترقية</span>
            </div>

            {/* بادج 3: (مقفول - مثال) */}
            <div className="badge-item locked">
              <div className="badge-icon">🔒</div>
              <span>حبيب القرآن</span>
            </div>

            {/* بادج 4: (مقفول - مثال) */}
            <div className="badge-item locked">
              <div className="badge-icon">🔒</div>
              <span>مداوم الصلاة</span>
            </div>
          </div>
        </div>
      );
      case 'library': return (
        <div className="library-container">
          
          {/* قسم القرآن الكريم */}
          <div className="library-card quran-card">
            <div className="card-header">
              <span className="card-icon">📖</span>
              <h3>القرآن الكريم</h3>
            </div>
            <p className="card-desc">سجل قراءتك واحسب حسناتك. (الصفحة ≈ 500 XP)</p>
            
            <div className="quran-logger">
              <input 
                type="number" 
                placeholder="كم صفحة قرأت اليوم؟" 
                value={quranPages}
                onChange={(e) => setQuranPages(e.target.value)}
              />
              <button onClick={logQuran}>
                <span>✍️</span> تسجيل وحساب
              </button>
            </div>
          </div>

          {/* قسم الأذكار */}
          <div className="library-section-title">حصن المسلم 🏰</div>
          
          <div className="athkar-grid">
            <div className="athkar-item" onClick={() => setCurrentAthkar('morning')}>
              <span>🌅 أذكار الصباح</span>
            </div>
            <div className="athkar-item" onClick={() => setCurrentAthkar('evening')}>
              <span>🌃 أذكار المساء</span>
            </div>
            <div className="athkar-item" onClick={() => setCurrentAthkar('sleep')}>
              <span>🛌 أذكار النوم</span>
            </div>
            <div className="athkar-item" onClick={() => setCurrentAthkar('mosque')}>
              <span>🕌 أذكار المسجد</span>
            </div>
          </div>

          {/* شاشة الأذكار */}
          {currentAthkar && (
            <div className="athkar-modal" onClick={() => setCurrentAthkar(null)}>
              <div className="athkar-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={() => setCurrentAthkar(null)}>✕</button>
                <h3>
                  {currentAthkar === 'morning' && '🌅 أذكار الصباح'}
                  {currentAthkar === 'evening' && '🌃 أذكار المساء'}
                  {currentAthkar === 'sleep' && '🛌 أذكار النوم'}
                  {currentAthkar === 'mosque' && '🕌 أذكار المسجد'}
                </h3>
                <div className="athkar-list">
                  {getAthkarList(currentAthkar).map((athkar, index) => (
                    <div key={index} className="athkar-item-detail">
                      <p className="athkar-text">{athkar.text}</p>
                      <p className="athkar-count">{athkar.count}</p>
                      {athkar.source && (
                        <p className="athkar-source">{athkar.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
      
      // 4. تصميم شاشة الأدوات (السبحة)
      case 'tools': return (
        <div className="tools-container">
          <div className="tasbeeh-card">
            <h3>📿 السبحة الإلكترونية</h3>
            <div className="tasbeeh-display">{tasbeehCount}</div>
            <button className="tasbeeh-btn" onClick={incrementTasbeeh}>
              سبحان الله
            </button>
            <button className="reset-btn" onClick={resetTasbeeh}>
              <span>🔄</span> تصفير
            </button>
          </div>
        </div>
      );
      
      case 'profile': return (
        <div className="profile-container">
          <h2>الملف الشخصي 👤</h2>
          <div className="profile-info">
            <p><strong>البريد:</strong> {user?.email}</p>
            <p><strong>النوع:</strong> {gender === 'male' ? 'ذكر 👨' : 'أنثى 🧕'}</p>
            <p><strong>المستوى:</strong> {level}</p>
            <p><strong>الحسنات:</strong> {xp}</p>
          </div>

          <div className="settings-section">
            <h3>الإعدادات ⚙️</h3>
            
            <div className="setting-item">
              <div className="setting-label">
                <span>🌙 الوضع الليلي (Dark Mode)</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={darkMode} 
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>🔔 الإشعارات</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications} 
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>🔊 الصوت</span>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={soundEnabled} 
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-label">
                <span>👤 تغيير النوع</span>
              </div>
              <div className="gender-select-small">
                <button 
                  className={gender === 'male' ? 'gender-btn active' : 'gender-btn'}
                  onClick={() => {
                    setGender('male');
                    if (user) {
                      updateDoc(doc(db, "users", user.uid), { gender: 'male' });
                    }
                  }}
                >
                  ذكر 👨
                </button>
                <button 
                  className={gender === 'female' ? 'gender-btn active' : 'gender-btn'}
                  onClick={() => {
                    setGender('female');
                    if (user) {
                      updateDoc(doc(db, "users", user.uid), { gender: 'female' });
                    }
                  }}
                >
                  أنثى 🧕
                </button>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button className="logout-btn" onClick={() => signOut(auth)}>
              تسجيل الخروج 👋
            </button>
          </div>
        </div>
      );
      default: return <div className="screen-placeholder">🏠 شاشة المهام اليومية</div>;
    }
  };

  return (
    <div className="app-container">
      
      {/* --- الجزء الأول: الشريط العلوي (التحفيز) --- */}
      <header className="top-bar">
        <div className="user-info">
          <span className="user-title">اللقب: باحث عن الخير 🧭</span>
          <div className="header-actions">
            <button 
              className="dark-mode-toggle" 
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <span className="user-level">مستوى {level}</span>
          </div>
        </div>
        {/* شريط التقدم الديناميكي */}
        <div className="xp-progress-container">
          <div className="xp-progress-fill" style={{ width: `${Math.min(((xp % (level * 1000)) / (level * 1000)) * 100, 100)}%` }}></div>
        </div>
        <div className="xp-text">{xp} / {level * 1000} حسنة</div>
      </header>

      {/* --- الجزء الثاني: منطقة المحتوى المتغير --- */}
      <main className="content-area">
        {renderContent()}
      </main>

      {/* --- الجزء الثالث: شريط التنقل السفلي --- */}
      <nav className="bottom-nav">
        {/* زرار الرئيسية */}
        <button 
          className={activeTab === 'home' ? 'nav-item active' : 'nav-item'} 
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span>الرئيسية</span>
        </button>

        {/* زرار الرحلة */}
        <button 
          className={activeTab === 'journey' ? 'nav-item active' : 'nav-item'} 
          onClick={() => setActiveTab('journey')}
        >
          <span className="nav-icon">🗺️</span>
          <span>الرحلة</span>
        </button>

        {/* زرار المكتبة */}
        <button 
          className={activeTab === 'library' ? 'nav-item active' : 'nav-item'} 
          onClick={() => setActiveTab('library')}
        >
          <span className="nav-icon">📖</span>
          <span>المكتبة</span>
        </button>

        {/* زرار الأدوات */}
        <button 
          className={activeTab === 'tools' ? 'nav-item active' : 'nav-item'} 
          onClick={() => setActiveTab('tools')}
        >
          <span className="nav-icon">🛠️</span>
          <span>الأدوات</span>
        </button>

        {/* زرار البروفايل */}
        <button 
          className={activeTab === 'profile' ? 'nav-item active' : 'nav-item'} 
          onClick={() => setActiveTab('profile')}
        >
          <span className="nav-icon">👤</span>
          <span>حسابي</span>
        </button>
      </nav>

    </div>
  );
}

export default App;

