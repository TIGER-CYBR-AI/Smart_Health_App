# -- coding: utf-8 --
import datetime
import os
from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.checkbox import CheckBox
from kivymd.app import MDApp
from kivymd.uix.button import MDRaisedButton, MDFillRoundFlatButton
from kivymd.uix.dialog import MDDialog

if not os.path.exists("phone_secret_vault"):
    os.makedirs("phone_secret_vault")

class WindowManager(ScreenManager):
    pass

class LanguageScreen(Screen):
    def select_lang(self, lang_code):
        App.get_running_app().lang = lang_code
        self.manager.current = 'questions_screen'

class QuestionsScreen(Screen):
    def on_pre_enter(self):
        lang = App.get_running_app().lang
        if lang == 1:
            self.ids.title.text = "مساعدك الصحي والطبي الذكي"
            self.ids.lbl_name.text = "الاسم الكريم:"
            self.ids.lbl_cycle.text = "مدة الدورة بالايام (مثال 28):"
            self.ids.lbl_weight.text = "الوزن الحالي بالكيلوغرام:"
            self.ids.lbl_height.text = "الطول الحالي بالسنتيمتر:"
            self.ids.lbl_pass.text = "تعيين كلمة سر لملفك السري:"
            self.ids.lbl_date.text = "تاريخ اخر دورة (يوم-شهر-سنة):"
            self.ids.btn_submit.text = "حفظ البيانات والدخول للتطبيق"
        else:
            self.ids.title.text = "Smart Medical Assistant"
            self.ids.lbl_name.text = "Your Name:"
            self.ids.lbl_cycle.text = "Cycle length in days:"
            self.ids.lbl_weight.text = "Weight in KG:"
            self.ids.lbl_height.text = "Height in CM:"
            self.ids.lbl_pass.text = "Set secret file password:"
            self.ids.lbl_date.text = "Last period (day-month-year):"
            self.ids.btn_submit.text = "Save Data and Enter App"

    def process_data(self):
        app = App.get_running_app()
        try:
            app.user_name = self.ids.txt_name.text
            app.cycle_length = int(self.ids.txt_cycle.text)
            app.weight = float(self.ids.txt_weight.text)
            app.height = float(self.ids.txt_height.text)
            app.user_password = self.ids.txt_pass.text
            date_str = self.ids.txt_date.text
            d, m, y = map(int, date_str.split('-'))
            app.last_period_date = datetime.date(y, m, d)
            if not app.user_password.strip(): return
            self.manager.current = 'dashboard_screen'
        except:
            pass

class DashboardScreen(Screen):
    def on_pre_enter(self):
        app = App.get_running_app()
        today = datetime.date.today()
        next_period = app.last_period_date + datetime.timedelta(days=app.cycle_length)
        ovulation_day = next_period - datetime.timedelta(days=14)
        days_to_period = (next_period - today).days
        days_to_ovulation = (ovulation_day - today).days
        self.ids.lbl_profile.text = f"* {app.user_name} *"
        
        if days_to_period > 0:
            self.ids.period_num.text = str(days_to_period)
            self.ids.period_txt.text = "ايام على الدورة" if app.lang==1 else "Days to Period"
        else:
            self.ids.period_num.text = "اليوم" if app.lang==1 else "Today"
            self.ids.period_txt.text = "الموعد المتوقع" if app.lang==1 else "Expected"

        if days_to_ovulation > 0:
            self.ids.ovulation_num.text = str(days_to_ovulation)
            self.ids.ovulation_txt.text = "ايام على التبويض" if app.lang==1 else "Days to Ovulation"
        else:
            self.ids.ovulation_num.text = "انتهى" if app.lang==1 else "Ended"
            self.ids.ovulation_txt.text = "التبويض المنقضي" if app.lang==1 else "Passed"

    def open_kit(self):
        lang = App.get_running_app().lang
        msg = "حقيبتك الميدانية:\n1. فوط صحية مريحة\n2. سوائل دافئة وقرفة\n3. ملابس قطنية" if lang==1 else "Your Kit:\n1. Pads\n2. Warm Drinks\n3. Comfy Clothes"
        dialog = MDDialog(title="ملف المستلزمات" if lang==1 else "Essentials Kit", text=msg, size_hint=(0.8, 0.4))
        dialog.open()

    def open_secret(self):
        self.manager.current = 'secret_vault_screen'

class SecretVaultScreen(Screen):
    def check_password(self):
        app = App.get_running_app()
        typed_pass = self.ids.vault_pass.text
        if typed_pass == app.user_password:
            self.ids.secret_content.opacity = 1
            self.ids.lbl_vault_status.text = "تم فتح الخزنة السرية بنجاح" if app.lang==1 else "Vault Opened Successfully"
        else:
            self.ids.secret_content.opacity = 0
            self.ids.lbl_vault_status.text = "كلمة السر خاطئة الحماية مفعّلة" if app.lang==1 else "Wrong Password!"

class MainApp(MDApp):
    lang = 1
    user_name = ""
    cycle_length = 28
    weight = 60.0
    height = 160.0
    user_password = ""
    last_period_date = datetime.date.today()
    def build(self):
        self.theme_cls.primary_palette = "Pink"
        return WindowManager()

if _name_ == '_main_':
    MainApp().run()
