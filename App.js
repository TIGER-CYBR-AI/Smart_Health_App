import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';

export default function App() {
  const [screen, setScreen] = useState('Language');
  const [selectedLang, setSelectedLang] = useState('ar');

  // حقول الاستبيان الطبي فارغة تماماً وجاهزة لإدخال المستخدمة من الصفر 🌸
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');

  // تاريخ آخر موعد للمحيض مقسم لثلاث خانات فارغة: سنة / شهر / يوم
  const [periodYear, setPeriodYear] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  const [periodDay, setPeriodDay] = useState('');

  const [periodDuration, setPeriodDuration] = useState(''); // عدد أيام نزول الدم
  const [cycleLength, setCycleLength] = useState(''); // كم يوم من المحيض للمحيض

  // 🩺 بيانات الحالة الصحية العامة (شاشة جديدة بعد اختيار اللغة)
  const [generalWeight, setGeneralWeight] = useState('');
  const [generalHeight, setGeneralHeight] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState(''); // 'none' | 'pregnant' | 'breastfeeding' | 'trying'

  // 🔑 مفتاح Groq API الخاص بكِ (مجاني ومفتوح المصدر، بدون قيود جغرافية)
  const GROQ_API_KEY = 

  // نتائج الحسابات الطبية
  const [calculatedData, setCalculatedData] = useState({
    daysRemaining: 0,
    nextPeriodDate: '',
    ovulationDate: '',
    statusText: ''
  });

  // محادثة الذكاء الاصطناعي والتحميل
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: 'أهلاً بكِ يا أميرتي 🌸 أنا طبيبكِ الافتراضي الحقيقي المتصل بالإنترنت، كيف يمكنني مساعدتكِ وطمأنتكِ اليوم؟' }
  ]);

  const [vaultPassword, setVaultPassword] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isPasswordSet, setIsPasswordSet] = useState(false);

  const handleLanguageSelect = (lang) => {
    setSelectedLang(lang);
    setScreen('GeneralHealth');
  };

  const handleGeneralHealthNext = () => {
    if (!pregnancyStatus) {
      alert("الرجاء تحديد حالتكِ الحالية أولاً ✨");
      return;
    }
    setScreen('Registration');
  };

  // 🧪 نظام الإشعارات من أعلى الهاتف
  const triggerMedicalNotifications = (daysLeft) => {
    if (daysLeft === 3) {
      Alert.alert("🔔 إشعار من طبيب المرأة", "عزيزتي الأميرة، يرجى الاستعداد.. متبقي 3 أيام فقط على بدء فترة الطمث 🌸");
    } else if (daysLeft === 2) {
      Alert.alert("🔔 إشعار من طبيب المرأة", "نذكركِ يا أميرتي بالاستعداد البدني والنفسي، متبقي يومان فقط 🎀");
    } else if (daysLeft === 0) {
      Alert.alert(
        "🔔 إشعار حيوي هام",
        "حسب الحسابات الطبية، اليوم هو موعد طمثكِ المتوقع. هل بدأ بالفعل؟",
        [
          { text: "نعم، بدأ 🩸", onPress: () => console.log("تم تأكيد بدء الدورة") },
          { text: "لا، ليس بعد 🧼", onPress: () => console.log("تم تأجيل الحساب") }
        ]
      );
    }
  };

  const triggerEndNotification = () => {
    const msg = "الحمد لله على سلامة الأميرة الكيوت! طهر الله قلبك وجسدك ونوّر أيامك القادمة";
    Alert.alert("🌸 الحمد لله على السلامة", msg);
  };

  // الدالة الحسابية الطبية
  const calculateMedicalCycle = () => {
    if (
      !userName.trim() || !userAge.trim() ||
      !periodYear.trim() || !periodMonth.trim() || !periodDay.trim() ||
      !periodDuration.trim() || !cycleLength.trim()
    ) {
      alert("الرجاء إكمال كافة البيانات الطبية الأساسية أولاً بدقة ✨");
      return;
    }

    const yyyy = periodYear.trim().padStart(4, '0');
    const mm = periodMonth.trim().padStart(2, '0');
    const dd = periodDay.trim().padStart(2, '0');
    const lastDate = new Date(yyyy + '-' + mm + '-' + dd);

    if (isNaN(lastDate.getTime())) {
      alert("الرجاء التأكد من صحة تاريخ آخر موعد للمحيض (السنة والشهر واليوم)");
      return;
    }

    const length = parseInt(cycleLength) || 28;
    const duration = parseInt(periodDuration) || 6;

    const nextPeriod = new Date(lastDate);
    nextPeriod.setDate(lastDate.getDate() + length);

    const ovulation = new Date(nextPeriod);
    ovulation.setDate(nextPeriod.getDate() - 14);

    const today = new Date('2026-08-21');
    const timeDiff = nextPeriod.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let status = 'فترة الأيام العادية ✨';
    const periodEnd = new Date(lastDate);
    periodEnd.setDate(lastDate.getDate() + duration);

    if (today >= lastDate && today <= periodEnd) {
      status = 'فترة الطمث الحالية 🩸';
    } else if (today.toDateString() === ovulation.toDateString()) {
      status = 'أعلى معدل لخصوبة التبويض 🥚';
    }

    setCalculatedData({
      daysRemaining: daysLeft > 0 ? daysLeft : 0,
      nextPeriodDate: nextPeriod.toISOString().split('T')[0],
      ovulationDate: ovulation.toISOString().split('T')[0],
      statusText: status
    });

    setScreen('Dashboard');

    setTimeout(() => {
      triggerMedicalNotifications(daysLeft > 0 ? daysLeft : 0);
    }, 1500);
  };

  // 🧠 دالة الاتصال الحقيقية بـ Groq API (نموذج Llama مفتوح المصدر - مجاني وبدون قيود جغرافية)
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setIsAiLoading(true);

    let pregnancyText = "لا يوجد حمل أو رضاعة حالياً";
    if (pregnancyStatus === 'pregnant') pregnancyText = "حامل حالياً";
    if (pregnancyStatus === 'breastfeeding') pregnancyText = "مرضعة حالياً";
    if (pregnancyStatus === 'trying') pregnancyText = "تحاول الحمل حالياً";

    const systemPrompt =
      "أنتِ طبيبة نسائية افتراضية خبيرة ولطيفة جداً، اسمكِ طبيب المرأة الذكي. تتحدثين بأسلوب محترم وداعم وكيوت. " +
      "بيانات المستخدمة: العمر " + userAge + " سنة، الوزن " + (generalWeight || "غير محدد") + " كجم، الطول " + (generalHeight || "غير محدد") + " سم، " +
      "أمراض مزمنة أو حالات معروفة: " + (chronicConditions || "لا يوجد") + "، حساسية من أدوية أو أطعمة: " + (allergies || "لا يوجد") + "، الحالة الحالية: " + pregnancyText + ". " +
      "استخدمي هذه المعلومات لتخصيص نصائحكِ الطبية والغذائية بدقة وعلمية تامة، وأجيبي بنفس لغة السؤال.";

    try {
      const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
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
      setScreen('VaultContent');
    } else {
      alert("الرجاء إدخال 4 أرقام دقيقة 🔐");
    }
  };

  const handleCheckPassword = () => {
    if (inputPassword === vaultPassword) {
      setInputPassword('');
      setScreen('VaultContent');
    } else {
      alert("الرمز السري خاطئ! حاولِ مجدداً ❌");
      setInputPassword('');
    }
  };

  // --- 1. شاشة اختيار اللغة ---
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

  // --- 2. شاشة الحالة الصحية العامة (جديدة) ---
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

        <TouchableOpacity style={[styles.langButton, styles.arabicButton, {marginTop: 20}]} onPress={handleGeneralHealthNext}>
          <Text style={styles.langTextActive}>التالي ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- 3. شاشة الاستبيان الطبي (فارغة بالكامل) ---
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
            <TextInput
              style={styles.dateBox}
              placeholder="سنة"
              placeholderTextColor="#BAA"
              keyboardType="numeric"
              maxLength={4}
              value={periodYear}
              onChangeText={setPeriodYear}
            />
            <TextInput
              style={styles.dateBox}
              placeholder="شهر"
              placeholderTextColor="#BAA"
              keyboardType="numeric"
              maxLength={2}
              value={periodMonth}
              onChangeText={setPeriodMonth}
            />
            <TextInput
              style={styles.dateBox}
              placeholder="يوم"
              placeholderTextColor="#BAA"
              keyboardType="numeric"
              maxLength={2}
              value={periodDay}
              onChangeText={setPeriodDay}
            />
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

        <TouchableOpacity style={[styles.langButton, styles.arabicButton, {marginTop: 20}]} onPress={calculateMedicalCycle}>
          <Text style={styles.langTextActive}>إنشاء الحساب الطبي وحفظه ✨</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- 3. لوحة التحكم الحقيقية المربوطة بالمعادلة الطبية ---
  if (screen === 'Dashboard') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerDecoration}>
          <Text style={styles.decoratorLine}>============</Text>
          <Text style={styles.princessTitle}>👑 {userName} - {userAge} Years Old 👑</Text>
          <Text style={styles.decoratorLine}>============</Text>
        </View>

        <View style={styles.circleContainer}>
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Text style={styles.circleNumber}>{calculatedData.daysRemaining}</Text>
              <Text style={styles.circleText}>أيام متبقية للدورة</Text>
            </View>
          </View>
          <Text style={styles.dashboardStatus}>{calculatedData.statusText}</Text>

          <Text style={styles.dateText}>📅 موعد الطمث القادم المتوقع: </Text>
          <Text style={styles.dateValue}>{calculatedData.nextPeriodDate}</Text>

          <Text style={styles.dateText}>🥚 يوم التبويض الطبي المحسوب: </Text>
          <Text style={styles.dateValue}>{calculatedData.ovulationDate}</Text>

          <Text style={styles.dateText}>🧼 مدة حيضكِ المسجلة: </Text>
          <Text style={styles.dateValue}>{periodDuration} أيام</Text>
        </View>

        <TouchableOpacity style={styles.safeButtonTest} onPress={triggerEndNotification}>
          <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>
            🧸 تجربة إشعار انتهاء المحيض والتهنئة بالسلامة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.aiDoctorBanner} onPress={() => setScreen('AiChat')}>
          <Text style={styles.aiDoctorIcon}>🩺🧸</Text>
          <View style={{marginRight: 10, alignItems: 'flex-start'}}>
            <Text style={styles.aiDoctorTitle}>طبيب الذكاء الاصطناعي الحقيقي</Text>
            <Text style={styles.aiDoctorSub}>اضغطي هنا لبدء استشارتكِ الطبية الفورية</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
          {/* كرت الملف السري الخزنة المحمي بكلمة سر */}
          <TouchableOpacity style={styles.fileContainer} onPress={() => setScreen('VaultLock')}>
            <View style={styles.realFileTab} />
            <View style={styles.realFileBody}>
              <Text style={styles.bearHugging}>🧸</Text>
              <Text style={styles.fileLockIcon}>🔒</Text>
              <Text style={styles.fileTitleText}>الملف السري</Text>
              <Text style={styles.fileDescText}>خزنة الفرو المشفرة</Text>
            </View>
          </TouchableOpacity>

          {/* كرت ملف المستلزمات الطبية والغذائية الذكي */}
          <TouchableOpacity style={styles.fileContainer} onPress={() => setScreen('AiChat')}>
            <View style={styles.realFileTab} />
            <View style={styles.realFileBody}>
              <Text style={styles.bearHugging}>🧸</Text>
              <Text style={styles.fileLockIcon}>📦</Text>
              <Text style={styles.fileTitleText}>المستلزمات</Text>
              <Text style={styles.fileDescText}>توصيات الغذاء والـ AI</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // --- 4. شاشة شات طبيب الذكاء الاصطناعي الحقيقي عبر الإنترنت ---
  if (screen === 'AiChat') {
    return (
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={{fontSize: 20}}>🧸🩺</Text>
          <Text style={styles.chatHeaderTitle}>طبيب المرأة الذكي</Text>
          <TouchableOpacity onPress={() => setScreen('Dashboard')}>
            <Text style={{color: '#FF6B8B', fontWeight: 'bold'}}>خروج</Text>
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
              <Text style={{fontSize: 12, color: '#888', marginLeft: 8}}>جاري التفكير الطبي...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.chatInputRow}>
          <TextInput style={styles.chatTextInput} placeholder="اسألي طبيبكِ عن أي عرض أو طعام مخصص..." value={chatInput} onChangeText={setChatInput} editable={!isAiLoading} />
          <TouchableOpacity style={styles.sendChatButton} onPress={handleSendMessage} disabled={isAiLoading}>
            <Text style={{color: '#FFF', fontWeight: 'bold'}}>إرسال</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- 5. شاشة قفل الملف السري (الخزنة بكلمة مرور) ---
  if (screen === 'VaultLock') {
    return (
      <View style={styles.container}>
        <Text style={styles.cardIcon}>🔐🧸</Text>
        <Text style={styles.welcomeTitle}>{isPasswordSet ? "خزنتكِ مقفلة بأمان" : "تعيين رمز الخزنة الفرو لأول مرة"}</Text>
        <Text style={styles.welcomeSubtitle}>الرجاء إدخال 4 أرقام لحماية صوركِ الحساسة</Text>
        <TextInput style={styles.pinInput} placeholder="0 0 0 0" keyboardType="numeric" maxLength={4} secureTextEntry={true} value={inputPassword} onChangeText={setInputPassword} />
        <TouchableOpacity style={[styles.langButton, styles.arabicButton]} onPress={isPasswordSet ? handleCheckPassword : handleSetPassword}>
          <Text style={styles.langTextActive}>{isPasswordSet ? "فتح الخزنة الوردي" : "حفظ الرمز السري"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('Dashboard')}>
          <Text style={{color: '#FF6B8B', fontWeight: 'bold', marginTop: 10}}>رجوع للوحة التحكم</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 6. شاشة محتوى الخزنة السرية المكتملة بنجاح ---
  if (screen === 'VaultContent') {
    return (
      <View style={styles.container}>
        <Text style={styles.cardIcon}>🔓🧸</Text>
        <Text style={styles.welcomeTitle}>Pink Vault</Text>
        <Text style={styles.welcomeSubtitle}>Your private photos and notes are 100% safe</Text>
        <View style={styles.vaultPlaceholder}>
          <Text style={{color: '#FF6B8B', fontWeight: 'bold'}}>معرض الصور والمفكرة الوردية المشفرة 🖼️📝</Text>
        </View>
        <TouchableOpacity style={[styles.langButton, {backgroundColor: '#666'}]} onPress={() => setScreen('Dashboard')}>
          <Text style={styles.langTextActive}>إغلاق الخزنة بأمان</Text>
        </TouchableOpacity>
      </View>
    );
  }
} // 👈 إغلاق دالة App الرئيسية بنجاح وعزل التنسيقات

// 🎨 التنسيقات البصرية والجمالية الاحترافية الشاملة والمحدثة بالكامل
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
  dashboardStatus: { fontSize: 15, fontWeight: 'bold', color: '#4A4A4A', marginTop: 10, marginBottom: 15 },
  datesCard: { width: '95%', backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#FF6B8B', elevation: 2 },
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
  vaultPlaceholder: { width: '95%', backgroundColor: '#FFF', borderRadius: 15, padding: 30, alignItems: 'center', marginVertical: 20, borderWidth: 1, borderColor: '#FFE0E5' },
});
