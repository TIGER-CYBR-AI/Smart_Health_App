import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal, Image, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [screen, setScreen] = useState('Loading');
  const [selectedLang, setSelectedLang] = useState('ar');

  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');

  const [periodYear, setPeriodYear] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodDay, setPeriodDay] = useState('');

  const [periodDuration, setPeriodDuration] = useState('');
  const [cycleLength, setCycleLength] = useState('');

  const [generalWeight, setGeneralWeight] = useState('');
  const [generalHeight, setGeneralHeight] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('');

  const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

  // ==================== منطق الدورة الحي (يُحسب من التاريخ الأصلي فقط، بدون تخزين رقم ثابت) ====================
  const [cycleInfo, setCycleInfo] = useState(null);
  // يحفظ آخر حالة تم الإشعار عنها لتفادي تكرار نفس الإشعار
  const notifiedRef = useRef({ anchorKey: '', d3: false, d2: false, periodStart: false, periodEnd: false });

  const computeCycleInfo = () => {
    if (!periodYear || !periodMonth || !periodDay || !cycleLength || !periodDuration) return null;

    const yyyy = periodYear.trim().padStart(4, '0');
    const mm = periodMonth.trim().padStart(2, '0');
    const dd = periodDay.trim().padStart(2, '0');
    let anchor = new Date(yyyy + '-' + mm + '-' + dd);
    if (isNaN(anchor.getTime())) return null;
    anchor.setHours(0, 0, 0, 0);

    const length = parseInt(cycleLength) || 28;
    const duration = parseInt(periodDuration) || 6;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // نحرّك تاريخ بداية الدورة للأمام تلقائياً لحد ما نوصل لأقرب دورة (حالية أو قادمة) - هيك العداد بيضل حي دايماً بدون ما نخزن رقم ثابت
    let periodStart = new Date(anchor);
    let periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + duration - 1);

    while (today > periodEnd) {
      periodStart.setDate(periodStart.getDate() + length);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + duration - 1);
    }

    const isPeriodNow = today >= periodStart && today <= periodEnd;

    const ovulation = new Date(periodStart);
    ovulation.setDate(periodStart.getDate() - length + duration + (length - 14));
    // حساب أبسط وأدق للتبويض: 14 يوم قبل بداية الدورة القادمة
    const ovulationDate = new Date(periodStart);
    ovulationDate.setDate(periodStart.getDate() - 14);

    const msPerDay = 1000 * 3600 * 24;

    // الفرق الدقيق بالوقت الفعلي (لحساب الساعات بدقة) لحد لحظة بداية الدورة (الساعة 00:00 من يوم البداية)
    const diffToStartMs = periodStart.getTime() - now.getTime();
    const daysToNextPeriod = Math.max(0, Math.ceil(diffToStartMs / msPerDay));
    const hoursToNextPeriod = Math.max(0, Math.floor((diffToStartMs % msPerDay) / (1000 * 3600)));

    const periodEndBoundary = new Date(periodEnd);
    periodEndBoundary.setHours(23, 59, 59, 999);
    const diffToEndMs = periodEndBoundary.getTime() - now.getTime();
    const daysLeftInPeriod = Math.max(0, Math.ceil(diffToEndMs / msPerDay));
    const hoursLeftInPeriod = Math.max(0, Math.floor((diffToEndMs % msPerDay) / (1000 * 3600)));

    return {
      periodStart,
      periodEnd,
      isPeriodNow,
      daysToNextPeriod,
      hoursToNextPeriod,
      daysLeftInPeriod,
      hoursLeftInPeriod,
      ovulationDate,
      anchorKey: periodStart.toISOString().split('T')[0],
    };
  };

  // إعادة حساب كل دقيقة عشان عداد الساعات يضل حي، وعند فتح لوحة التحكم
  useEffect(() => {
    if (screen !== 'Dashboard') return;
    const update = () => setCycleInfo(computeCycleInfo());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [screen, periodYear, periodMonth, periodDay, cycleLength, periodDuration]);

  // إشعارات تلقائية: قبل 3 أيام، قبل يومين، وعند بداية الدورة فعلياً (تلقائي بدون ضغط)، وعند انتهائها
  useEffect(() => {
    if (!cycleInfo) return;
    const flags = notifiedRef.current;

    // لو تغيّرت الدورة (بدأت دورة جديدة) نصفّر كل الإشعارات
    if (flags.anchorKey !== cycleInfo.anchorKey) {
      notifiedRef.current = { anchorKey: cycleInfo.anchorKey, d3: false, d2: false, periodStart: false, periodEnd: false };
    }

    if (!cycleInfo.isPeriodNow) {
      if (cycleInfo.daysToNextPeriod === 3 && !notifiedRef.current.d3) {
        notifiedRef.current.d3 = true;
        Alert.alert('🔔 إشعار من طبيب المرأة', 'عزيزتي، يرجى الاستعداد.. متبقي 3 أيام فقط على بدء فترة الطمث 🌸');
      }
      if (cycleInfo.daysToNextPeriod === 2 && !notifiedRef.current.d2) {
        notifiedRef.current.d2 = true;
        Alert.alert('🔔 إشعار من طبيب المرأة', 'نذكركِ بالاستعداد البدني والنفسي، متبقي يومان فقط 🎀');
      }
    } else if (cycleInfo.isPeriodNow && !notifiedRef.current.periodStart) {
      notifiedRef.current.periodStart = true;
      Alert.alert('🩸 بدأت فترة الطمث', 'حسب حساباتكِ الطبية، اليوم هو بداية موعد طمثكِ 🌸');
    }
  }, [cycleInfo]);

  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'أهلاً بكِ يا أميرتي 🌸 أنا طبيبكِ الافتراضي الحقيقي المتصل بالإنترنت، كيف يمكنني مساعدتكِ وطمأنتكِ اليوم؟' }
  ]);

  // ==================== الخزنة: رمز سري دائم + صور + ملاحظات ====================
  const [vaultPassword, setVaultPassword] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [vaultPhotos, setVaultPhotos] = useState([]);
  const [vaultNoteText, setVaultNoteText] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [vaultTab, setVaultTab] = useState('photos'); // 'photos' | 'notes'

  // 🌸 إعدادات الإعلانات
  const INTERSTITIAL_LINK = 'https://www.profitableratecpmnetwork.com/yg9n6zwp2n?key=fc38f2fdc96be1b732242b8a32defd8b';
  const AADS_BANNER_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;}</style>
</head>
<body style="display:flex;justify-content:center;align-items:center;height:100%;">
<div id="frame" style="width:300px;margin:auto;height:250px">
<iframe data-aa="2454281" src="https://ad.a-ads.com/2454281/?size=300x250" style="border:0;padding:0;width:300px;height:250px;overflow:hidden;margin:auto" scrolling="no"></iframe>
</div>
</body>
</html>
`;
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialTimer, setInterstitialTimer] = useState(5);
  const [interstitialFailed, setInterstitialFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  // 🌸 عند فتح التطبيق: التحقق من وجود بيانات محفوظة مسبقاً (بيانات الدورة + الخزنة معاً)
  useEffect(() => {
    checkSavedData();
  }, []);

  useEffect(() => {
    if (screen === 'Dashboard' && !showInterstitial) {
      setShowInterstitial(true);
      setInterstitialTimer(5);
      setInterstitialFailed(false);
    }
  }, [screen]);

  useEffect(() => {
    if (showInterstitial && interstitialTimer > 0) {
      const t = setTimeout(() => setInterstitialTimer(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [showInterstitial, interstitialTimer]);

  const checkSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('userMedicalData');
      const savedVault = await AsyncStorage.getItem('vaultData');

      if (savedVault) {
        const vParsed = JSON.parse(savedVault);
        setVaultPassword(vParsed.vaultPassword || '');
        setIsPasswordSet(!!vParsed.vaultPassword);
        setVaultPhotos(vParsed.vaultPhotos || []);
        setSavedNotes(vParsed.savedNotes || []);
      }

      if (savedData) {
        const parsed = JSON.parse(savedData);
        setUserName(parsed.userName || '');
        setUserAge(parsed.userAge || '');
        setPeriodYear(parsed.periodYear || '');
        setPeriodMonth(parsed.periodMonth || '');
        setPeriodDay(parsed.periodDay || '');
        setPeriodDuration(parsed.periodDuration || '');
        setCycleLength(parsed.cycleLength || '');
        setGeneralWeight(parsed.generalWeight || '');
        setGeneralHeight(parsed.generalHeight || '');
        setChronicConditions(parsed.chronicConditions || '');
        setAllergies(parsed.allergies || '');
        setPregnancyStatus(parsed.pregnancyStatus || '');
        setScreen('Dashboard');
      } else {
        setScreen('Language');
      }
    } catch (error) {
      console.error('خطأ بقراءة البيانات المحفوظة:', error);
      setScreen('Language');
    }
  };

  const saveDataToStorage = async (dataToSave) => {
    try {
      await AsyncStorage.setItem('userMedicalData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('خطأ بحفظ البيانات:', error);
    }
  };

  // 💾 حفظ بيانات الخزنة بشكل مستقل ودائم (رمز سري + صور + ملاحظات) - يُستدعى في كل مرة تتغير فيها
  const saveVaultToStorage = async (newVaultPassword, newPhotos, newNotes) => {
    try {
      await AsyncStorage.setItem('vaultData', JSON.stringify({
        vaultPassword: newVaultPassword,
        vaultPhotos: newPhotos,
        savedNotes: newNotes,
      }));
    } catch (error) {
      console.error('خطأ بحفظ بيانات الخزنة:', error);
    }
  };

  const handleLanguageSelect = (lang) => {
    setSelectedLang(lang);
    setScreen('GeneralHealth');
  };

  const handleGeneralHealthNext = () => {
    if (!pregnancyStatus) {
      alert('الرجاء تحديد حالتكِ الحالية أولاً ✨');
      return;
    }
    setScreen('Registration');
  };

  const triggerEndNotification = () => {
    const msg = 'الحمد لله على سلامة الأميرة الكيوت! طهر الله قلبك وجسدك ونوّر أيامك القادمة';
    Alert.alert('🌸 الحمد لله على السلامة', msg);
  };

  const calculateMedicalCycle = () => {
    if (
      !userName.trim() || !userAge.trim() ||
      !periodYear.trim() || !periodMonth.trim() || !periodDay.trim() ||
      !periodDuration.trim() || !cycleLength.trim()
    ) {
      alert('الرجاء إكمال كافة البيانات الطبية الأساسية أولاً بدقة ✨');
      return;
    }

    const yyyy = periodYear.trim().padStart(4, '0');
    const mm = periodMonth.trim().padStart(2, '0');
    const dd = periodDay.trim().padStart(2, '0');
    const testDate = new Date(yyyy + '-' + mm + '-' + dd);

    if (isNaN(testDate.getTime())) {
      alert('الرجاء التأكد من صحة تاريخ آخر موعد للمحيض (السنة والشهر واليوم)');
      return;
    }

    saveDataToStorage({
      userName, userAge,
      periodYear, periodMonth, periodDay,
      periodDuration, cycleLength,
      generalWeight, generalHeight, chronicConditions, allergies, pregnancyStatus,
    });

    setScreen('Dashboard');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setIsAiLoading(true);

    let pregnancyText = 'لا يوجد حمل أو رضاعة حالياً';
    if (pregnancyStatus === 'pregnant') pregnancyText = 'حامل حالياً';
    if (pregnancyStatus === 'breastfeeding') pregnancyText = 'مرضعة حالياً';
    if (pregnancyStatus === 'trying') pregnancyText = 'تحاول الحمل حالياً';

    const systemPrompt =
      'أنتِ طبيبة نسائية افتراضية خبيرة ولطيفة جداً، اسمكِ طبيب المرأة الذكي. تتحدثين بأسلوب محترم وداعم وكيوت. ' +
      'بيانات المستخدمة: العمر ' + userAge + ' سنة، الوزن ' + (generalWeight || 'غير محدد') + ' كجم، الطول ' + (generalHeight || 'غير محدد') + ' سم، ' +
      'أمراض مزمنة أو حالات معروفة: ' + (chronicConditions || 'لا يوجد') + '، حساسية من أدوية أو أطعمة: ' + (allergies || 'لا يوجد') + '، الحالة الحالية: ' + pregnancyText + '. ' +
      'استخدمي هذه المعلومات لتخصيص نصائحكِ الطبية والغذائية بدقة وعلمية تامة، وأجيبي بنفس لغة السؤال.';

    try {
      const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: currentInput }
          ]
        })
      });

      const data = await response.json();
      const aiText = data?.choices?.[0]?.message?.content;

      if (aiText) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
      } else if (data?.error?.message) {
        setChatMessages(prev => [...prev, { sender: 'ai', text: '⚠️ خطأ من Groq: ' + data.error.message }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'ai', text: '⚠️ رد غير متوقع: ' + JSON.stringify(data).slice(0, 300) }]);
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'تعذر الاتصال بالإنترنت، يرجى التأكد من شبكة الجوال والمحاولة مجدداً 🧸❌' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ---- الخزنة: تعيين/فتح الرمز، مع حفظ دائم فوري ----
  const handleSetPassword = () => {
    if (inputPassword.length === 4) {
      setVaultPassword(inputPassword);
      setIsPasswordSet(true);
      setInputPassword('');
      saveVaultToStorage(inputPassword, vaultPhotos, savedNotes);
      setScreen('VaultContent');
    } else {
      alert('الرجاء إدخال 4 أرقام دقيقة 🔐');
    }
  };

  const handleCheckPassword = () => {
    if (inputPassword === vaultPassword) {
      setInputPassword('');
      setScreen('VaultContent');
    } else {
      alert('الرمز السري خاطئ! حاولِ مجدداً ❌');
      setInputPassword('');
    }
  };

  // ---- الخزنة: رفع صورة حقيقي من الجهاز ----
  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('لازم تسمحي للتطبيق بالوصول لصور جهازكِ عشان تقدري تخزنيها بالخزنة 🔐');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newPhotos = [...vaultPhotos, result.assets[0].uri];
      setVaultPhotos(newPhotos);
      saveVaultToStorage(vaultPassword, newPhotos, savedNotes);
    }
  };

  const handleDeletePhoto = (uri) => {
    const newPhotos = vaultPhotos.filter(p => p !== uri);
    setVaultPhotos(newPhotos);
    saveVaultToStorage(vaultPassword, newPhotos, savedNotes);
  };

  // ---- الخزنة: المفكرة ----
  const handleSaveNote = () => {
    if (!vaultNoteText.trim()) return;
    const newNote = { id: Date.now().toString(), text: vaultNoteText.trim() };
    const newNotes = [newNote, ...savedNotes];
    setSavedNotes(newNotes);
    setVaultNoteText('');
    saveVaultToStorage(vaultPassword, vaultPhotos, newNotes);
  };

  const handleDeleteNote = (id) => {
    const newNotes = savedNotes.filter(n => n.id !== id);
    setSavedNotes(newNotes);
    saveVaultToStorage(vaultPassword, vaultPhotos, newNotes);
  };

  // --- 0. شاشة تحميل مؤقتة أثناء فحص البيانات المحفوظة ---
  if (screen === 'Loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B8B" />
      </View>
    );
  }

  if (screen === 'Language') {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🧸🌸</Text>
          <Text style={styles.welcomeTitle}>Welcome / مرحباً بكِ</Text>
          <Text style={styles.welcomeSubtitle}>Please choose your language / الرجاء اختيار اللغة</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.langButton, styles.arabicButton]} onPress={() => handleLanguageSelect('ar')}>
            <Text style={styles.langTextActive}>العربية</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.langButton, styles.englishButton]} onPress={() => handleLanguageSelect('en')}>
            <Text style={styles.langTextDark}>English</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'GeneralHealth') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.logoEmoji}>🩺💗</Text>
        <Text style={styles.welcomeTitle}>حالتكِ الصحية العامة</Text>
        <Text style={styles.welcomeSubtitle}>هذه المعلومات تساعد طبيبتكِ الذكية على فهم حالتكِ بدقة وإعطائكِ نصائح مخصصة</Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>الوزن (كجم):</Text>
          <TextInput style={styles.cuteInput} placeholder="مثال: 60" placeholderTextColor="#BAA" keyboardType="numeric" value={generalWeight} onChangeText={setGeneralWeight} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>الطول (سم):</Text>
          <TextInput style={styles.cuteInput} placeholder="مثال: 160" placeholderTextColor="#BAA" keyboardType="numeric" value={generalHeight} onChangeText={setGeneralHeight} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>أمراض مزمنة أو حالات صحية معروفة (إن وجدت):</Text>
          <TextInput style={styles.cuteInput} placeholder="مثال: سكري، ضغط، فقر دم..." placeholderTextColor="#BAA" value={chronicConditions} onChangeText={setChronicConditions} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>حساسية من أدوية أو أطعمة (إن وجدت):</Text>
          <TextInput style={styles.cuteInput} placeholder="مثال: حساسية من البنسلين..." placeholderTextColor="#BAA" value={allergies} onChangeText={setAllergies} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>حالتكِ الحالية:</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.statusOption, pregnancyStatus === 'none' && styles.statusOptionActive]}
              onPress={() => setPregnancyStatus('none')}
            >
              <Text style={pregnancyStatus === 'none' ? styles.langTextActive : styles.langTextDark}>لا شيء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, pregnancyStatus === 'pregnant' && styles.statusOptionActive]}
              onPress={() => setPregnancyStatus('pregnant')}
            >
              <Text style={pregnancyStatus === 'pregnant' ? styles.langTextActive : styles.langTextDark}>حامل</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusOption, pregnancyStatus === 'breastfeeding' && styles.statusOptionActive]}
              onPress={() => setPregnancyStatus('breastfeeding')}
            >
              <Text style={pregnancyStatus === 'breastfeeding' ? styles.langTextActive : styles.langTextDark}>مرضعة</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.langButton, styles.arabicButton, { marginTop: 20 }]} onPress={handleGeneralHealthNext}>
          <Text style={styles.langTextActive}>التالي ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'Registration') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.logoEmoji}>🩺📋</Text>
        <Text style={styles.welcomeTitle}>الملف الطبي الشخصي للمرأة</Text>
        <Text style={styles.welcomeSubtitle}>الرجاء إدخال البيانات بدقة طبية لضبط حساباتكِ الحيوية</Text>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>الاسم أو اللقب:</Text>
          <TextInput style={styles.cuteInput} placeholder="اكتبي اسمكِ الجميل هنا" placeholderTextColor="#BAA" value={userName} onChangeText={setUserName} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>العمر الحالي:</Text>
          <TextInput style={styles.cuteInput} placeholder="اكتبي عمركِ هنا" placeholderTextColor="#BAA" keyboardType="numeric" value={userAge} onChangeText={setUserAge} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>تاريخ آخر موعد للمحيض:</Text>
          <View style={styles.dateRow}>
            <TextInput style={styles.dateBox} placeholder="سنة" placeholderTextColor="#BAA" keyboardType="numeric" maxLength={4} value={periodYear} onChangeText={setPeriodYear} />
            <TextInput style={styles.dateBox} placeholder="شهر" placeholderTextColor="#BAA" keyboardType="numeric" maxLength={2} value={periodMonth} onChangeText={setPeriodMonth} />
            <TextInput style={styles.dateBox} placeholder="يوم" placeholderTextColor="#BAA" keyboardType="numeric" maxLength={2} value={periodDay} onChangeText={setPeriodDay} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>عدد أيام الطمث المعتادة (أيام نزول الدم):</Text>
          <TextInput style={styles.cuteInput} placeholder="مثال: 6" placeholderTextColor="#BAA" keyboardType="numeric" value={periodDuration} onChangeText={setPeriodDuration} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>كم يوم من المحيض للمحيض:</Text>
          <TextInput style={styles.cuteInput} placeholder="المعدل الطبيعي: 28" placeholderTextColor="#BAA" keyboardType="numeric" value={cycleLength} onChangeText={setCycleLength} />
        </View>

        <TouchableOpacity style={[styles.langButton, styles.arabicButton, { marginTop: 20 }]} onPress={calculateMedicalCycle}>
          <Text style={styles.langTextActive}>إنشاء الحساب الطبي وحفظه ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'Dashboard') {
    return (
      <View style={{ flex: 1 }}>
        <Modal visible={showInterstitial} transparent={false} animationType="fade">
          <View style={{ flex: 1 }}>
            <WebView
              source={{ uri: INTERSTITIAL_LINK }}
              style={{ flex: 1 }}
              onError={() => setInterstitialFailed(true)}
              onHttpError={() => setInterstitialFailed(true)}
            />
            {interstitialFailed && (
              <View style={styles.adFallback}>
                <Text style={{ color: '#FFF', textAlign: 'center' }}>تعذّر تحميل الإعلان حالياً</Text>
              </View>
            )}
            {(interstitialTimer > 0 && !interstitialFailed) ? (
              <View style={styles.timerBadge}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{interstitialTimer}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.closeAdButton} onPress={() => setShowInterstitial(false)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>✕ إغلاق</Text>
              </TouchableOpacity>
            )}
          </View>
        </Modal>

        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 70 }]}>
          <View style={styles.headerDecoration}>
            <Text style={styles.decoratorLine}>============</Text>
            <Text style={styles.princessTitle}>👑 {userName} - {userAge} Years Old 👑</Text>
            <Text style={styles.decoratorLine}>============</Text>
          </View>

          {!cycleInfo ? (
            <ActivityIndicator size="small" color="#FF6B8B" />
          ) : cycleInfo.isPeriodNow ? (
            // عداد أيام الطمث - يظهر تلقائياً بس تبدأ الدورة فعلياً
            <View style={styles.circleContainer}>
              <View style={[styles.outerCircle, { backgroundColor: '#FFC2CE', borderColor: '#FF6B8B' }]}>
                <View style={styles.innerCircle}>
                  <Text style={styles.circleNumber}>{cycleInfo.daysLeftInPeriod}</Text>
                  <Text style={styles.circleText}>أيام متبقية على انتهاء الطمث</Text>
                </View>
              </View>
              <View style={styles.hoursCircleSmall}>
                <Text style={styles.hoursNumberSmall}>{cycleInfo.hoursLeftInPeriod}</Text>
                <Text style={styles.hoursTextSmall}>ساعة</Text>
              </View>
              <Text style={styles.dashboardStatus}>🩸 فترة الطمث الحالية</Text>
            </View>
          ) : (
            <View style={styles.circleContainer}>
              <View style={styles.outerCircle}>
                <View style={styles.innerCircle}>
                  <Text style={styles.circleNumber}>{cycleInfo.daysToNextPeriod}</Text>
                  <Text style={styles.circleText}>أيام متبقية للدورة</Text>
                </View>
              </View>
              <View style={styles.hoursCircleSmall}>
                <Text style={styles.hoursNumberSmall}>{cycleInfo.hoursToNextPeriod}</Text>
                <Text style={styles.hoursTextSmall}>ساعة</Text>
              </View>
              <Text style={styles.dashboardStatus}>✨ فترة الأيام العادية</Text>

              <Text style={styles.dateText}>📅 موعد الطمث القادم المتوقع: </Text>
              <Text style={styles.dateValue}>{cycleInfo.periodStart.toISOString().split('T')[0]}</Text>

              <Text style={styles.dateText}>🥚 يوم التبويض الطبي المحسوب: </Text>
              <Text style={styles.dateValue}>{cycleInfo.ovulationDate.toISOString().split('T')[0]}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.safeButtonTest} onPress={triggerEndNotification}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>
              🧸 تجربة إشعار انتهاء المحيض والتهنئة بالسلامة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aiDoctorBanner} onPress={() => setScreen('AiChat')}>
            <Text style={styles.aiDoctorIcon}>🩺🧸</Text>
            <View style={{ marginRight: 10, alignItems: 'flex-start' }}>
              <Text style={styles.aiDoctorTitle}>طبيب الذكاء الاصطناعي الحقيقي</Text>
              <Text style={styles.aiDoctorSub}>اضغطي هنا لبدء استشارتكِ الطبية الفورية</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.gridContainer}>
            <TouchableOpacity style={styles.fileContainer} onPress={() => setScreen('VaultLock')}>
              <View style={styles.realFileTab} />
              <View style={styles.realFileBody}>
                <Text style={styles.bearHugging}>🧸</Text>
                <Text style={styles.fileLockIcon}>🔒</Text>
                <Text style={styles.fileTitleText}>الملف السري</Text>
                <Text style={styles.fileDescText}>خزنة الفرو المشفرة</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fileContainer} onPress={() => setScreen('Supplies')}>
              <View style={styles.realFileTab} />
              <View style={styles.realFileBody}>
                <Text style={styles.bearHugging}>🧸</Text>
                <Text style={styles.fileLockIcon}>📦</Text>
                <Text style={styles.fileTitleText}>المستلزمات</Text>
                <Text style={styles.fileDescText}>توصيات الغذاء والاحتياجات</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.bottomBanner}>
          <WebView
            source={{ html: AADS_BANNER_HTML }}
            style={{ flex: 1 }}
            scrollEnabled={false}
            onError={() => setBannerFailed(true)}
            onHttpError={() => setBannerFailed(true)}
          />
          {bannerFailed && (
            <Text style={{ position: 'absolute', color: '#AAA', fontSize: 11 }}>الإعلان غير متوفر حالياً</Text>
          )}
        </View>
      </View>
    );
  }

  // ==================== شاشة المستلزمات (منفصلة تماماً عن الذكاء الاصطناعي) ====================
  if (screen === 'Supplies') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.logoEmoji}>📦🧸</Text>
        <Text style={styles.welcomeTitle}>المستلزمات</Text>
        <Text style={styles.welcomeSubtitle}>قائمة احتياجاتكِ الأساسية خلال فترة الدورة</Text>

        <View style={styles.vaultPlaceholder}>
          <Text style={{ color: '#4A4A4A', textAlign: 'right', lineHeight: 24 }}>
            🧴 فوط صحية أو كوب طبي{"\n"}
            💊 مسكن آمن حسب وصف الطبيب{"\n"}
            🍫 وجبات خفيفة غنية بالحديد{"\n"}
            🧣 كمّادة دافئة لتخفيف التقلصات{"\n"}
            💧 كمية كافية من الماء يومياً
          </Text>
        </View>

        <TouchableOpacity onPress={() => setScreen('Dashboard')}>
          <Text style={{ color: '#FF6B8B', fontWeight: 'bold', marginTop: 10 }}>رجوع للوحة التحكم</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (screen === 'AiChat') {
    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={{ fontSize: 20 }}>🧸🩺</Text>
          <Text style={styles.chatHeaderTitle}>طبيب المرأة الذكي</Text>
          <TouchableOpacity onPress={() => setScreen('Dashboard')}>
            <Text style={{ color: '#FF6B8B', fontWeight: 'bold' }}>خروج</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.chatMessagesArea}>
          {chatMessages.map((msg, index) => (
            <View key={index} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={msg.sender === 'user' ? styles.userBubbleText : styles.aiBubbleText}>{msg.text}</Text>
            </View>
          ))}
          {isAiLoading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color="#FF6B8B" />
              <Text style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>جاري التفكير الطبي...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.chatInputRow}>
          <TextInput style={styles.chatTextInput} placeholder="اسألي طبيبكِ عن أي عرض أو طعام مخصص..." value={chatInput} onChangeText={setChatInput} editable={!isAiLoading} />
          <TouchableOpacity style={styles.sendChatButton} onPress={handleSendMessage} disabled={isAiLoading}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>إرسال</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screen === 'VaultLock') {
    return (
      <View style={styles.container}>
        <Text style={styles.cardIcon}>🔐🧸</Text>
        <Text style={styles.welcomeTitle}>{isPasswordSet ? 'خزنتكِ مقفلة بأمان' : 'تعيين رمز الخزنة الفرو لأول مرة'}</Text>
        <Text style={styles.welcomeSubtitle}>الرجاء إدخال 4 أرقام لحماية صوركِ الحساسة</Text>
        <TextInput style={styles.pinInput} placeholder="0 0 0 0" keyboardType="numeric" maxLength={4} secureTextEntry={true} value={inputPassword} onChangeText={setInputPassword} />
        <TouchableOpacity style={[styles.langButton, styles.arabicButton]} onPress={isPasswordSet ? handleCheckPassword : handleSetPassword}>
          <Text style={styles.langTextActive}>{isPasswordSet ? 'فتح الخزنة الوردي' : 'حفظ الرمز السري'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('Dashboard')}>
          <Text style={{ color: '#FF6B8B', fontWeight: 'bold', marginTop: 10 }}>رجوع للوحة التحكم</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'VaultContent') {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF5F5' }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.cardIcon}>🔓🧸</Text>
          <Text style={styles.welcomeTitle}>Pink Vault</Text>
          <Text style={styles.welcomeSubtitle}>Your private photos and notes are 100% safe</Text>

          <View style={styles.vaultTabsRow}>
            <TouchableOpacity style={[styles.vaultTabButton, vaultTab === 'photos' && styles.vaultTabActive]} onPress={() => setVaultTab('photos')}>
              <Text style={vaultTab === 'photos' ? styles.langTextActive : styles.langTextDark}>🖼️ الصور</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.vaultTabButton, vaultTab === 'notes' && styles.vaultTabActive]} onPress={() => setVaultTab('notes')}>
              <Text style={vaultTab === 'notes' ? styles.langTextActive : styles.langTextDark}>📝 المفكرة</Text>
            </TouchableOpacity>
          </View>

          {vaultTab === 'photos' ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <TouchableOpacity style={[styles.langButton, styles.arabicButton, { width: '90%' }]} onPress={handlePickImage}>
                <Text style={styles.langTextActive}>📷 إضافة صورة من الجهاز</Text>
              </TouchableOpacity>

              <View style={styles.photosGrid}>
                {vaultPhotos.length === 0 ? (
                  <Text style={{ color: '#AAA', marginTop: 15 }}>لا يوجد صور محفوظة بعد</Text>
                ) : (
                  vaultPhotos.map((uri, i) => (
                    <View key={i} style={styles.photoItem}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => handleDeletePhoto(uri)}>
                        <Text style={{ color: '#FFF', fontSize: 11 }}>حذف</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : (
            <View style={{ width: '95%' }}>
              <TextInput
                style={[styles.cuteInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="اكتبي مذكرتكِ الخاصة هنا..."
                placeholderTextColor="#BAA"
                multiline
                value={vaultNoteText}
                onChangeText={setVaultNoteText}
              />
              <TouchableOpacity style={[styles.langButton, styles.arabicButton, { marginTop: 10 }]} onPress={handleSaveNote}>
                <Text style={styles.langTextActive}>💾 حفظ المذكرة</Text>
              </TouchableOpacity>

              {savedNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <Text style={{ color: '#4A4A4A', textAlign: 'right', flex: 1 }}>{note.text}</Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                    <Text style={{ color: '#FF6B8B', fontWeight: 'bold', marginLeft: 10 }}>حذف</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.langButton, { backgroundColor: '#666', marginTop: 20 }]} onPress={() => setScreen('Dashboard')}>
            <Text style={styles.langTextActive}>إغلاق الخزنة بأمان</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContainer: { flexGrow: 1, backgroundColor: '#FFF5F5', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoEmoji: { fontSize: 50, marginBottom: 15, textAlign: 'center' },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  welcomeSubtitle: { fontSize: 13, color: '#888', marginTop: 8, textAlign: 'center', marginBottom: 20 },
  formGroup: { width: '95%', marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#4A4A4A', marginBottom: 6, textAlign: 'right' },
  cuteInput: { width: '100%', padding: 14, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E5', fontSize: 15, textAlign: 'right', color: '#333' },
  dateRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%' },
  dateBox: { width: '30%', padding: 14, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E5', fontSize: 15, textAlign: 'center', color: '#333' },
  statusOption: { width: '30%', padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E5', alignItems: 'center' },
  statusOptionActive: { backgroundColor: '#FF6B8B', borderColor: '#FF6B8B' },
  buttonContainer: { width: '100%', alignItems: 'center' },
  langButton: { width: '90%', padding: 16, borderRadius: 15, marginBottom: 15, alignItems: 'center', elevation: 2 },
  arabicButton: { backgroundColor: '#FF6B8B' },
  englishButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFE0E5' },
  langTextActive: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  langTextDark: { fontSize: 16, fontWeight: 'bold', color: '#4A4A4A' },
  headerDecoration: { alignItems: 'center', marginBottom: 20 },
  decoratorLine: { color: '#FFB6C1', fontSize: 11, letterSpacing: 2 },
  princessTitle: { fontSize: 18, fontWeight: 'bold', color: '#FF416C', marginVertical: 4 },
  circleContainer: { alignItems: 'center', marginBottom: 20, width: '100%' },
  outerCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFD6DD', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFB6C1' },
  innerCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  circleNumber: { fontSize: 44, fontWeight: 'bold', color: '#FF6B8B' },
  circleText: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 4 },
  hoursCircleSmall: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#FFB6C1', alignItems: 'center', justifyContent: 'center', marginTop: -20, elevation: 3 },
  hoursNumberSmall: { fontSize: 18, fontWeight: 'bold', color: '#FF6B8B' },
  hoursTextSmall: { fontSize: 9, color: '#888' },
  dashboardStatus: { fontSize: 15, fontWeight: 'bold', color: '#4A4A4A', marginTop: 10, marginBottom: 15 },
  dateText: { fontSize: 13, color: '#555', fontWeight: '600', textAlign: 'right', marginTop: 5 },
  dateValue: { fontWeight: 'bold', color: '#FF6B8B', textAlign: 'right', marginBottom: 5 },
  safeButtonTest: { width: '95%', backgroundColor: '#BA55D3', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 15, elevation: 2 },
  aiDoctorBanner: { width: '95%', backgroundColor: '#FFE4E1', borderRadius: 15, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FFB6C1' },
  aiDoctorIcon: { fontSize: 26 },
  aiDoctorTitle: { fontSize: 14, fontWeight: 'bold', color: '#FF416C' },
  aiDoctorSub: { fontSize: 11, color: '#888', marginTop: 2 },
  gridContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '95%' },
  fileContainer: { width: '48%', alignItems: 'center' },
  realFileTab: { width: '40%', height: 12, backgroundColor: '#FFD6DD', borderTopLeftRadius: 8, borderTopRightRadius: 8, alignSelf: 'flex-start' },
  realFileBody: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#FFE0E5', elevation: 2 },
  bearHugging: { fontSize: 24, marginBottom: 4 },
  fileLockIcon: { fontSize: 20, marginBottom: 4 },
  fileTitleText: { fontSize: 13, fontWeight: 'bold', color: '#4A4A4A' },
  fileDescText: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },
  chatContainer: { flex: 1, backgroundColor: '#FFF5F5' },
  chatHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FFE4E1', borderBottomWidth: 1, borderBottomColor: '#FFB6C1' },
  chatHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF416C' },
  chatMessagesArea: { flex: 1, padding: 15 },
  chatBubble: { maxWidth: '80%', padding: 12, borderRadius: 15, marginBottom: 10 },
  userBubble: { backgroundColor: '#FF6B8B', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFE0E5' },
  userBubbleText: { color: '#FFF', textAlign: 'right' },
  aiBubbleText: { color: '#333', textAlign: 'right' },
  loadingBubble: { flexDirection: 'row-reverse', alignItems: 'center', padding: 10, alignSelf: 'flex-start' },
  chatInputRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#FFE0E5', backgroundColor: '#FFF' },
  chatTextInput: { flex: 1, backgroundColor: '#FFF5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, textAlign: 'right', marginLeft: 10, color: '#333' },
  sendChatButton: { backgroundColor: '#FF6B8B', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  cardIcon: { fontSize: 50, marginBottom: 15, textAlign: 'center' },
  pinInput: { width: '60%', padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E5', fontSize: 24, textAlign: 'center', letterSpacing: 10, marginBottom: 20, color: '#333' },
  vaultPlaceholder: { width: '95%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, alignItems: 'flex-start', marginVertical: 20, borderWidth: 1, borderColor: '#FFE0E5' },
  vaultTabsRow: { flexDirection: 'row-reverse', width: '95%', marginBottom: 15 },
  vaultTabButton: { flex: 1, padding: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#FFE0E5', alignItems: 'center', marginHorizontal: 4 },
  vaultTabActive: { backgroundColor: '#FF6B8B', borderColor: '#FF6B8B' },
  photosGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', width: '95%', marginTop: 15, justifyContent: 'flex-start' },
  photoItem: { width: '31%', margin: '1%', alignItems: 'center' },
  photoThumb: { width: '100%', height: 90, borderRadius: 10 },
  deletePhotoBtn: { backgroundColor: '#FF6B8B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  noteCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginTop: 10, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0E5' },
  timerBadge: { position: 'absolute', top: 40, right: 20, backgroundColor: '#00000099', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  closeAdButton: { position: 'absolute', top: 40, right: 20, backgroundColor: '#FF6B8B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  adFallback: { position: 'absolute', top: '45%', width: '100%', alignItems: 'center' },
  bottomBanner: { height: 60, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#FFE0E5', alignItems: 'center', justifyContent: 'center' },
});
