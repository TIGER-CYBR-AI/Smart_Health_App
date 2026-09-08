import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';

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

  const [cycleInfo, setCycleInfo] = useState(null);
  const [notifyFlags, setNotifyFlags] = useState({ anchorKey: '', d3: false, d2: false, periodStart: false, periodEnd: false });

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

    let periodStart = new Date(anchor);
    let periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + duration - 1);

    while (today > periodEnd) {
      periodStart.setDate(periodStart.getDate() + length);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + duration - 1);
    }

    const isPeriodNow = today >= periodStart && today <= periodEnd;

    const ovulationDate = new Date(periodStart);
    ovulationDate.setDate(periodStart.getDate() - 14);

    const msPerDay = 1000 * 3600 * 24;

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
      targetDate: isPeriodNow ? periodEndBoundary : periodStart,
    };
  };

  const [liveClock, setLiveClock] = useState('00:00:00');

  useEffect(() => {
    if (screen !== 'Dashboard') return;
    const update = () => setCycleInfo(computeCycleInfo());
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [screen, periodYear, periodMonth, periodDay, cycleLength, periodDuration]);

  useEffect(() => {
    if (screen !== 'Dashboard' || !cycleInfo || !cycleInfo.targetDate) return;

    const tick = () => {
      const now = new Date();
      const diffMs = cycleInfo.targetDate.getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

      const remainderInDay = totalSeconds % 86400;
      const hh = Math.floor(remainderInDay / 3600);
      const mm = Math.floor((remainderInDay % 3600) / 60);
      const ss = remainderInDay % 60;

      const pad = (n) => n.toString().padStart(2, '0');
      setLiveClock(pad(hh) + ':' + pad(mm) + ':' + pad(ss));
    };

    tick();
    const clockInterval = setInterval(tick, 1000);
    return () => clearInterval(clockInterval);
  }, [screen, cycleInfo]);

  const saveNotifyFlags = async (flags) => {
    try {
      await AsyncStorage.setItem('cycleNotifyFlags', JSON.stringify(flags));
    } catch (e) {
      console.error('خطأ بحفظ حالة الإشعارات:', e);
    }
  };

  useEffect(() => {
    if (!cycleInfo) return;

    let flags = { ...notifyFlags };
    let changed = false;

    if (flags.anchorKey !== cycleInfo.anchorKey) {
      flags = { anchorKey: cycleInfo.anchorKey, d3: false, d2: false, periodStart: false, periodEnd: false };
      changed = true;
    }

    if (!cycleInfo.isPeriodNow) {
      if (cycleInfo.daysToNextPeriod === 3 && !flags.d3) {
        flags.d3 = true;
        changed = true;
        Alert.alert('🔔 إشعار من طبيب المرأة', 'عزيزتي، يرجى الاستعداد.. متبقي 3 أيام فقط على بدء فترة الطمث 🌸');
      }
      if (cycleInfo.daysToNextPeriod === 2 && !flags.d2) {
        flags.d2 = true;
        changed = true;
        Alert.alert('🔔 إشعار من طبيب المرأة', 'نذكركِ بالاستعداد البدني والنفسي، متبقي يومان فقط 🎀');
      }
      if (flags.periodStart && !flags.periodEnd) {
        flags.periodEnd = true;
        changed = true;
        Alert.alert('🌸 الحمد لله على السلامة', 'الحمد لله على سلامة الأميرة الكيوت! طهر الله قلبك وجسدك ونوّر أيامك القادمة');
      }
    } else if (cycleInfo.isPeriodNow && !flags.periodStart) {
      flags.periodStart = true;
      changed = true;
      Alert.alert('🩸 بدأت فترة الطمث', 'حسب حساباتكِ الطبية، اليوم هو بداية موعد طمثكِ 🌸');
    }

    if (changed) {
      setNotifyFlags(flags);
      saveNotifyFlags(flags);
    }
  }, [cycleInfo]);

  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'أهلاً بكِ يا أميرتي 🌸 أنا طبيبكِ الافتراضي الحقيقي المتصل بالإنترنت، كيف يمكنني مساعدتكِ وطمأنتكِ اليوم؟' }
  ]);

  const [vaultPassword, setVaultPassword] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [vaultPhotos, setVaultPhotos] = useState([]);
  const [vaultNoteText, setVaultNoteText] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [vaultTab, setVaultTab] = useState('photos');

  const [viewerPhotoUri, setViewerPhotoUri] = useState(null);
  const [viewerNote, setViewerNote] = useState(null);
  const [viewerNoteText, setViewerNoteText] = useState('');

  useEffect(() => {
    checkSavedData();
  }, []);

  const checkSavedData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('userMedicalData');
      const savedVault = await AsyncStorage.getItem('vaultData');
      const savedFlags = await AsyncStorage.getItem('cycleNotifyFlags');

      if (savedVault) {
        const vParsed = JSON.parse(savedVault);
        setVaultPassword(vParsed.vaultPassword || '');
        setIsPasswordSet(!!vParsed.vaultPassword);
        setVaultPhotos(vParsed.vaultPhotos || []);
        setSavedNotes(vParsed.savedNotes || []);
      }

      if (savedFlags) {
        setNotifyFlags(JSON.parse(savedFlags));
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

  // =========================================================================
  // === منطق الخزنة: الصور/الفيديو/الصوت — الدوال محفوظة هون بدون حذف،
  // === بس مش مستخدمة حالياً بالواجهة (مخفية مؤقتاً لحين حل مشكلة الحفظ)
  // =========================================================================

  const handlePickImage = async () => {
    const libPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPermission.granted) {
      alert('لازم تسمحي للتطبيق بالوصول لصور جهازكِ عشان تقدري تخزنيها بالخزنة 🔐');
      return;
    }
    const mediaPermission = await MediaLibrary.requestPermissionsAsync();
    if (!mediaPermission.granted) {
      alert('لازم تسمحي للتطبيق بإدارة الاستديو عشان تختفي الملفات منه فعلياً 🔐');
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });
    } catch (e) {
      console.error('خطأ بفتح معرض الصور:', e);
      alert('تعذر فتح معرض الصور، حاولي مجدداً 🙏');
      return;
    }

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    await processPickedAssets(result.assets, false);
  };

  const handlePickVideo = async () => {
    const libPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPermission.granted) {
      alert('لازم تسمحي للتطبيق بالوصول لفيديوهات جهازكِ عشان تقدري تخزنيها بالخزنة 🔐');
      return;
    }
    const mediaPermission = await MediaLibrary.requestPermissionsAsync();
    if (!mediaPermission.granted) {
      alert('لازم تسمحي للتطبيق بإدارة الاستديو عشان تختفي الملفات منه فعلياً 🔐');
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });
    } catch (e) {
      console.error('خطأ بفتح معرض الفيديوهات:', e);
      alert('تعذر فتح معرض الفيديوهات، حاولي مجدداً 🙏');
      return;
    }

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    await processPickedAssets(result.assets, true);
  };

  const processPickedAssets = async (assets, forceVideo) => {
    try {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'vault', { intermediates: true });
    } catch (dirErr) {
      // المجلد موجود مسبقاً، لا مشكلة
    }

    const newEntries = [];
    let failedCount = 0;
    let notHiddenCount = 0;

    for (const asset of assets) {
      try {
        const isVideo = forceVideo || asset.type === 'video' || (asset.mimeType || '').startsWith('video/');
        let destPath;

        if (isVideo) {
          const fileName = 'vault_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.mp4';
          destPath = FileSystem.documentDirectory + 'vault/' + fileName;
          await FileSystem.copyAsync({ from: asset.uri, to: destPath });
        } else {
          if (!asset.base64) {
            throw new Error('لم يتم استلام بيانات الصورة الخام من المعرض');
          }
          const tempPath = FileSystem.cacheDirectory + 'temp_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.jpg';
          await FileSystem.writeAsStringAsync(tempPath, asset.base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const manipulated = await ImageManipulator.manipulateAsync(
            tempPath,
            [{ resize: { width: 1080 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );

          const fileName = 'vault_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.jpg';
          destPath = FileSystem.documentDirectory + 'vault/' + fileName;
          await FileSystem.copyAsync({ from: manipulated.uri, to: destPath });

          try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch (cleanupErr) {}
        }

        const info = await FileSystem.getInfoAsync(destPath);
        if (!info.exists || info.size === 0) {
          throw new Error('الملف المنسوخ فاضي أو غير موجود');
        }

        let hiddenFromGallery = false;
        try {
          if (asset.assetId) {
            const deleteResult = await MediaLibrary.deleteAssetsAsync([asset.assetId]);
            hiddenFromGallery = deleteResult === true;
          }
        } catch (delErr) {
          console.log('تعذر إخفاء الملف الأصلي من الاستديو:', delErr);
        }
        if (!hiddenFromGallery) notHiddenCount++;

        newEntries.push({ uri: destPath, type: isVideo ? 'video' : 'image', hiddenFromGallery });
      } catch (e) {
        failedCount++;
        console.error('خطأ بمعالجة/نسخ الملف:', e);
      }
    }

    if (newEntries.length > 0) {
      setVaultPhotos(prev => {
        const updated = [...prev, ...newEntries];
        saveVaultToStorage(vaultPassword, updated, savedNotes);
        return updated;
      });
    }

    if (failedCount > 0) {
      alert('تعذر حفظ ' + failedCount + ' ملف بشكل سليم، الرجاء إعادة المحاولة 🙏 (الملفات الأصلية بقيت بأمان بالاستديو ولم تُمس)');
    }
    if (notHiddenCount > 0) {
      alert('تم حفظ الملفات بأمان داخل الخزنة ✅، لكن ' + notHiddenCount + ' ملف قد يبقى ظاهراً بالاستديو أيضاً بسبب قيود نظام أندرويد على هذا الجهاز تحديداً');
    }
  };

  const handlePickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets || result.assets.length === 0) return;

    try {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'vault', { intermediates: true });
    } catch (dirErr) {}

    const asset = result.assets[0];
    const safeName = (asset.name || 'audio').replace(/[^a-zA-Z0-9.-]/g, '');
    const fileName = 'vault_' + Date.now() + '' + Math.floor(Math.random() * 100000) + '' + safeName;
    const destPath = FileSystem.documentDirectory + 'vault/' + fileName;

    try {
      await FileSystem.copyAsync({ from: asset.uri, to: destPath });
      const info = await FileSystem.getInfoAsync(destPath);
      if (!info.exists || info.size === 0) throw new Error('ملف صوتي فاضي');

      const newPhotos = [...vaultPhotos, { uri: destPath, type: 'audio', hiddenFromGallery: false, name: asset.name || 'ملف صوتي' }];
      setVaultPhotos(newPhotos);
      saveVaultToStorage(vaultPassword, newPhotos, savedNotes);
    } catch (e) {
      console.error('خطأ بحفظ الملف الصوتي:', e);
      alert('تعذر حفظ الملف الصوتي، الرجاء إعادة المحاولة 🙏');
    }
  };

  const handleDeletePhoto = async (photo) => {
    try {
      if (photo.hiddenFromGallery && photo.type !== 'audio') {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });
    } catch (e) {
      console.log('خطأ أثناء إرجاع/حذف الملف:', e);
    }
    const newPhotos = vaultPhotos.filter(p => p.uri !== photo.uri);
    setVaultPhotos(newPhotos);
    saveVaultToStorage(vaultPassword, newPhotos, savedNotes);
    if (viewerPhotoUri === photo.uri) setViewerPhotoUri(null);
  };

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
    if (viewerNote && viewerNote.id === id) setViewerNote(null);
  };

  const openNoteViewer = (note) => {
    setViewerNote(note);
    setViewerNoteText(note.text);
  };

  const handleUpdateNote = () => {
    if (!viewerNote) return;
    const newNotes = savedNotes.map(n => n.id === viewerNote.id ? { ...n, text: viewerNoteText.trim() } : n);
    setSavedNotes(newNotes);
    saveVaultToStorage(vaultPassword, vaultPhotos, newNotes);
    setViewerNote(null);
  };

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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerDecoration}>
            <Text style={styles.decoratorLine}>============</Text>
            <Text style={styles.princessTitle}>👑 {userName} - {userAge} Years Old 👑</Text>
            <Text style={styles.decoratorLine}>============</Text>
          </View>

          {!cycleInfo ? (
            <ActivityIndicator size="small" color="#FF6B8B" />
          ) : cycleInfo.isPeriodNow ? (
            <View style={styles.circleContainer}>
              <View style={[styles.outerCircle, { backgroundColor: '#FFC2CE', borderColor: '#FF6B8B' }]}>
                <View style={styles.innerCircle}>
                  <Text style={styles.circleNumber}>{cycleInfo.daysLeftInPeriod}</Text>
                  <Text style={styles.circleText}>أيام متبقية على انتهاء الطمث</Text>
                </View>
              </View>
              <View style={styles.digitalClockBox}>
                <Text style={styles.digitalClockText}>{liveClock}</Text>
                <Text style={styles.digitalClockLabel}>ساعة : دقيقة : ثانية</Text>
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
              <View style={styles.digitalClockBox}>
                <Text style={styles.digitalClockText}>{liveClock}</Text>
                <Text style={styles.digitalClockLabel}>ساعة : دقيقة : ثانية</Text>
              </View>
              <Text style={styles.dashboardStatus}>✨ فترة الأيام العادية</Text>

              <Text style={styles.dateText}>📅 موعد الطمث القادم المتوقع: </Text>
              <Text style={styles.dateValue}>{cycleInfo.periodStart.toISOString().split('T')[0]}</Text>

              <Text style={styles.dateText}>🥚 يوم التبويض الطبي المحسوب: </Text>
              <Text style={styles.dateValue}>{cycleInfo.ovulationDate.toISOString().split('T')[0]}</Text>
            </View>
          )}

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
      </View>
    );
  }

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
          <Text style={styles.cardIcon}>📔🎀</Text>
          <Text style={styles.welcomeTitle}>مذكراتي السرية</Text>
          <Text style={styles.welcomeSubtitle}>مساحتكِ الخاصة الآمنة لكتابة كل ما يخطر ببالكِ 🌸</Text>

          <View style={{ width: '95%' }}>
            <TextInput
              style={[styles.cuteInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="🖋️ اكتبي ما يجول بخاطركِ هنا..."
              placeholderTextColor="#BAA"
              multiline
              value={vaultNoteText}
              onChangeText={setVaultNoteText}
            />
            <TouchableOpacity style={[styles.langButton, styles.arabicButton, { marginTop: 10 }]} onPress={handleSaveNote}>
              <Text style={styles.langTextActive}>💾 حفظ المذكرة</Text>
            </TouchableOpacity>

            {savedNotes.length === 0 ? (
              <Text style={{ color: '#AAA', marginTop: 15 }}>لا توجد مذكرات محفوظة بعد 🎀</Text>
            ) : (
              savedNotes.map((note) => (
                <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => openNoteViewer(note)}>
                  <Text style={{ color: '#4A4A4A', textAlign: 'right', flex: 1 }} numberOfLines={1}>{note.text}</Text>
                  <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                    <Text style={{ color: '#FF6B8B', fontWeight: 'bold', marginLeft: 10 }}>حذف</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>

          <TouchableOpacity style={[styles.langButton, { backgroundColor: '#666', marginTop: 20 }]} onPress={() => setScreen('Dashboard')}>
            <Text style={styles.langTextActive}>إغلاق الخزنة بأمان</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={!!viewerPhotoUri} transparent={true} animationType="fade">
          <View style={styles.photoViewerOverlay}>
            <TouchableOpacity style={styles.photoViewerClose} onPress={() => setViewerPhotoUri(null)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>✕ إغلاق</Text>
            </TouchableOpacity>
            {viewerPhotoUri && (
              <Image source={{ uri: viewerPhotoUri }} style={styles.photoViewerImage} resizeMode="contain" />
            )}
          </View>
        </Modal>

        <Modal visible={!!viewerNote} transparent={true} animationType="fade">
          <View style={styles.noteViewerOverlay}>
            <View style={styles.noteViewerBox}>
              <TextInput
                style={[styles.cuteInput, { height: 200, textAlignVertical: 'top' }]}
                multiline
                value={viewerNoteText}
                onChangeText={setViewerNoteText}
              />
              <View style={{ flexDirection: 'row-reverse', marginTop: 15 }}>
                <TouchableOpacity style={[styles.langButton, styles.arabicButton, { width: '48%', marginLeft: '4%' }]} onPress={handleUpdateNote}>
                  <Text style={styles.langTextActive}>💾 حفظ التعديل</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.langButton, { backgroundColor: '#666', width: '48%' }]} onPress={() => setViewerNote(null)}>
                  <Text style={styles.langTextActive}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  digitalClockBox: { minWidth: 150, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#4A4A4A', alignItems: 'center', justifyContent: 'center', marginTop: -20, elevation: 3, borderWidth: 2, borderColor: '#FFB6C1' },
  digitalClockText: { fontSize: 22, fontWeight: 'bold', color: '#FFD6DD', letterSpacing: 2 },
  digitalClockLabel: { fontSize: 9, color: '#DDD', marginTop: 2 },
  dashboardStatus: { fontSize: 15, fontWeight: 'bold', color: '#4A4A4A', marginTop: 10, marginBottom: 15 },
  dateText: { fontSize: 13, color: '#555', fontWeight: '600', textAlign: 'right', marginTop: 5 },
  dateValue: { fontWeight: 'bold', color: '#FF6B8B', textAlign: 'right', marginBottom: 5 },
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
  photoViewerOverlay: { flex: 1, backgroundColor: '#000000EE', alignItems: 'center', justifyContent: 'center' },
  photoViewerImage: { width: '95%', height: '80%' },
  photoViewerClose: { position: 'absolute', top: 40, right: 20, backgroundColor: '#FF6B8B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, zIndex: 10 },
  noteViewerOverlay: { flex: 1, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  noteViewerBox: { width: '90%', backgroundColor: '#FFF5F5', borderRadius: 15, padding: 15 },
});
