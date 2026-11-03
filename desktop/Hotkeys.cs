// Pirate Token Tracker: optional Windows companion. No keyboard hook, game process
// access, simulated game input, admin key, or persisted authentication secrets.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace PirateTokenHotkeys {
  public static class Json {
    public static readonly JavaScriptSerializer Codec = new JavaScriptSerializer { MaxJsonLength = 16000000 };
    public static Dictionary<string,object> Map(object value) { return value as Dictionary<string,object> ?? new Dictionary<string,object>(); }
    public static string Text(Dictionary<string,object> value,string key) { return value.ContainsKey(key) && value[key]!=null ? Convert.ToString(value[key]) : ""; }
    public static long Number(Dictionary<string,object> value,string key) { long result; return Int64.TryParse(Text(value,key),out result) ? result : 0; }
    public static List<Dictionary<string,object>> Rows(Dictionary<string,object> value,string key) {
      if (!value.ContainsKey(key) || value[key]==null) return new List<Dictionary<string,object>>();
      return ((System.Collections.IEnumerable)value[key]).Cast<object>().Select(Map).ToList();
    }
  }
  public sealed class Pending {
    public string Id { get; set; }
    public string Action { get; set; }
    public Dictionary<string,object> Payload { get; set; }
    public string Error { get; set; }
    public string CreatedAt { get; set; }
  }
  public sealed class Outbox {
    public List<Pending> Items { get; private set; }
    readonly string path;
    public Outbox(string file) {
      path=file;
      Items=File.Exists(path) ? Json.Codec.Deserialize<List<Pending>>(File.ReadAllText(path,Encoding.UTF8)) : new List<Pending>();
      if (Items==null || Items.Any(x=>x==null || x.Payload==null || String.IsNullOrEmpty(x.Id))) throw new IOException("Der lokale Puffer ist beschädigt. Bitte die Datei sichern und prüfen.");
    }
    static void AtomicWrite(string path,string contents) {
      Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)));
      string temp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
      try {
        using (var stream=new FileStream(temp,FileMode.CreateNew,FileAccess.Write,FileShare.None,4096,FileOptions.WriteThrough)) {
          byte[] bytes=new UTF8Encoding(false).GetBytes(contents); stream.Write(bytes,0,bytes.Length); stream.Flush(true);
        }
        if (File.Exists(path)) File.Replace(temp,path,null); else File.Move(temp,path);
      } finally { if (File.Exists(temp)) File.Delete(temp); }
    }
    void Commit(List<Pending> items) { AtomicWrite(path,Json.Codec.Serialize(items)); Items=items; }
    public void Add(Pending item) { var next=new List<Pending>(Items); next.Add(item); Commit(next); }
    public void Acknowledge(string id) { Commit(Items.Where(x=>x.Id!=id).ToList()); }
    public void Block(string id,string error) {
      var next=Json.Codec.Deserialize<List<Pending>>(Json.Codec.Serialize(Items)); next.First(x=>x.Id==id).Error=error; Commit(next);
    }
    public void ArchiveRejected() {
      if (Items.Count==0 || String.IsNullOrEmpty(Items[0].Error)) throw new InvalidOperationException("Nur sicher abgelehnte Eingaben dürfen archiviert werden.");
      // Keep rejected requests recoverable, even if removal from the queue fails.
      string journal=path+".rejected.jsonl";
      using (var stream=new FileStream(journal,FileMode.Append,FileAccess.Write,FileShare.Read,4096,FileOptions.WriteThrough)) {
        byte[] bytes=Encoding.UTF8.GetBytes(Json.Codec.Serialize(Items[0])+Environment.NewLine); stream.Write(bytes,0,bytes.Length); stream.Flush(true);
      }
      Acknowledge(Items[0].Id);
    }
  }
  public static class Rules {
    public static string Actor(Dictionary<string,object> snapshot,string uid) {
      var p=Json.Rows(snapshot,"players").FirstOrDefault(x=>Json.Text(x,"auth_id")==uid);
      string actor=p==null ? "" : Json.Text(p,"id");
      if (actor!="max" && actor!="szymon") throw new InvalidOperationException("Dieser Account ist keinem Tracker-Spieler zugeordnet.");
      return actor;
    }
    public static Pending Make(Dictionary<string,object> state,string actor,bool undo) {
      if (actor!="max" && actor!="szymon") throw new InvalidOperationException("Bitte zuerst anmelden.");
      var round=Json.Rows(state,"rounds").FirstOrDefault(x=>String.IsNullOrEmpty(Json.Text(x,"ended_at")));
      var payload=new Dictionary<string,object> { {"player_id",actor} };
      if (!undo) {
        if (round==null && Json.Rows(state,"sessions").Any(x=>String.IsNullOrEmpty(Json.Text(x,"ended_at")))) throw new InvalidOperationException("Im Tracker zuerst die nächste Runde starten.");
        var count=round==null ? null : Json.Rows(state,"counts").FirstOrDefault(x=>Json.Text(x,"round_id")==Json.Text(round,"id") && Json.Text(x,"player_id")==actor);
        if (round!=null && count==null) throw new InvalidOperationException("Rundenstand fehlt. Bitte erneut verbinden.");
        payload["delta"]=1; payload["round_id"]=round==null ? null : round["id"]; payload["expected_revision"]=count==null ? 0 : Json.Number(count,"revision");
      } else {
        var changes=Json.Rows(state,"changes");
        var c=changes.FirstOrDefault(x=>Json.Text(x,"player_id")==actor && Json.Text(x,"reason")=="live" && Json.Number(x,"delta")>0 && !changes.Any(y=>Json.Text(y,"reversal_of")==Json.Text(x,"id")));
        if (c==null) throw new InvalidOperationException("Kein geeigneter Live-Klick für Rückgängig vorhanden.");
        string rid=Json.Text(c,"round_id");
        var oldRound=Json.Rows(state,"rounds").FirstOrDefault(x=>Json.Text(x,"id")==rid);
        var count=Json.Rows(state,"counts").FirstOrDefault(x=>Json.Text(x,"round_id")==rid && Json.Text(x,"player_id")==actor);
        if (rid!="" && (oldRound==null || Json.Text(oldRound,"ended_at")!="" || count==null || Json.Number(count,"revision")!=Json.Number(c,"round_revision"))) throw new InvalidOperationException("Diese Runde im Tracker korrigieren; schnelles Rückgängig ist nicht mehr möglich.");
        payload["change_id"]=c["id"]; payload["expected_revision"]=count==null ? 0 : Json.Number(count,"revision");
      }
      return new Pending { Id=Guid.NewGuid().ToString(),Action=undo ? "undo" : "increment",Payload=payload,CreatedAt=DateTime.UtcNow.ToString("o") };
    }
  }
  public sealed class ApiFailure : Exception {
    public bool Transient, Expired;
    public ApiFailure(string message,bool transient,bool expired) : base(message) { Transient=transient; Expired=expired; }
  }
  public sealed class Api : IDisposable {
    const string Url="https://umdavntscukcixmfvtks.supabase.co";
    const string PublicKey="sb_publishable_DsP7hZ3CIjWLS3Y0RUIVkQ_q-EUhZkj";
    readonly HttpClient http;
    string access="",refresh="";
    DateTime expires=DateTime.MinValue;
    public string UserId { get; private set; }
    public Api() { ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12; http=new HttpClient { Timeout=TimeSpan.FromSeconds(12) }; }
    public Api(HttpMessageHandler fake) { http=new HttpClient(fake); }
    async Task<Dictionary<string,object>> Request(string path,object body,bool authenticated) {
      try {
        using (var request=new HttpRequestMessage(HttpMethod.Post,Url+path)) {
          request.Headers.Add("apikey",PublicKey);
          if (authenticated) request.Headers.Authorization=new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",access);
          request.Content=new StringContent(Json.Codec.Serialize(body),Encoding.UTF8,"application/json");
          using (var response=await http.SendAsync(request)) {
            string raw=await response.Content.ReadAsStringAsync();
            Dictionary<string,object> data;
            try { data=Json.Map(Json.Codec.DeserializeObject(raw)); } catch { data=new Dictionary<string,object>(); }
            if (!response.IsSuccessStatusCode) {
              string code=Json.Text(data,"code"),message=Json.Text(data,"message");
              if (message=="") message=Json.Text(data,"error_description");
              if (message=="") message=Json.Text(data,"msg");
              bool expired=(int)response.StatusCode==401;
              bool transient=(int)response.StatusCode>=500 || (int)response.StatusCode==429 || (int)response.StatusCode==408 || code.StartsWith("08") || code.StartsWith("40") || code.StartsWith("53") || code.StartsWith("57") || code.StartsWith("PGRST00");
              throw new ApiFailure(message=="" ? "Supabase meldet HTTP "+(int)response.StatusCode : message,transient,expired);
            }
            if (raw.Length>0 && data.Count==0) throw new ApiFailure("Ungültige Serverantwort. Eingaben bleiben vorgemerkt.",true,false);
            return data;
          }
        }
      } catch (HttpRequestException) { throw new ApiFailure("Keine Verbindung. Eingaben bleiben lokal vorgemerkt.",true,false); }
      catch (TaskCanceledException) { throw new ApiFailure("Zeitüberschreitung. Eingaben bleiben lokal vorgemerkt.",true,false); }
    }
    void Session(Dictionary<string,object> data) {
      string token=Json.Text(data,"access_token"),next=Json.Text(data,"refresh_token");
      string uid=Json.Text(Json.Map(data.ContainsKey("user") ? data["user"] : null),"id");
      if (token=="" || next=="" || uid=="" || (UserId!=null && uid!=UserId)) throw new ApiFailure("Anmeldung nicht bestätigt. Bitte neu anmelden.",false,true);
      access=token; refresh=next; UserId=uid; expires=DateTime.UtcNow.AddSeconds(Math.Max(60,Json.Number(data,"expires_in"))-30);
    }
    public async Task Login(string email,string password) {
      try { Session(await Request("/auth/v1/token?grant_type=password",new {email=email,password=password},false)); }
      catch (ApiFailure e) { if (e.Transient) throw; throw new ApiFailure("Anmeldung fehlgeschlagen. Tracker-E-Mail und Passwort prüfen.",false,true); }
    }
    async Task EnsureSession(bool force) {
      if (String.IsNullOrEmpty(refresh)) throw new ApiFailure("Bitte im Helfer anmelden.",false,true);
      if (force || DateTime.UtcNow>=expires) Session(await Request("/auth/v1/token?grant_type=refresh_token",new {refresh_token=refresh},false));
    }
    async Task<Dictionary<string,object>> Rpc(string name,object body) {
      await EnsureSession(false);
      try { return await Request("/rest/v1/rpc/"+name,body,true); }
      catch (ApiFailure e) { if (!e.Expired) throw; }
      await EnsureSession(true); return await Request("/rest/v1/rpc/"+name,body,true);
    }
    public Task<Dictionary<string,object>> Snapshot() { return Rpc("tracker_snapshot",new {}); }
    public Task<Dictionary<string,object>> Mutate(Pending item) { return Rpc("tracker_mutate",new {p_request_id=item.Id,p_action=item.Action,p_payload=item.Payload}); }
    public async Task Logout() { if (access!="") await Request("/auth/v1/logout?scope=local",new {},true); Dispose(); }
    public void Dispose() { access=""; refresh=""; UserId=null; http.Dispose(); }
  }
  public sealed class Hotkey {
    public uint Modifiers { get; set; }
    public uint Key { get; set; }
    public string Label { get; set; }
    public static Hotkey From(Keys keys) {
      Keys key=keys & Keys.KeyCode;
      bool function=key>=Keys.F1 && key<=Keys.F11;
      bool letter=(key>=Keys.A && key<=Keys.Z) || (key>=Keys.D0 && key<=Keys.D9);
      bool ctrl=(keys & Keys.Control)!=0,alt=(keys & Keys.Alt)!=0,shift=(keys & Keys.Shift)!=0;
      if (!function && !(letter && (ctrl || alt))) throw new InvalidOperationException("F1–F11 wählen oder Strg/Alt + Buchstabe/Ziffer verwenden.");
      return new Hotkey {Key=(uint)key,Modifiers=(uint)((alt ? 1 : 0)|(ctrl ? 2 : 0)|(shift ? 4 : 0)),Label=(ctrl ? "Strg + " : "")+(alt ? "Alt + " : "")+(shift ? "Shift + " : "")+key.ToString().Replace("D",letter && key>=Keys.D0 && key<=Keys.D9 ? "" : "D")};
    }
    public static void Validate(Hotkey[] keys) {
      if (keys==null || keys.Length!=3 || keys.Any(k=>k==null)) throw new InvalidOperationException("Bitte drei Hotkeys auswählen.");
      if (keys.Select(k=>k.Modifiers+":"+k.Key).Distinct().Count()!=3) throw new InvalidOperationException("+1, Rückgängig und Pause brauchen verschiedene Hotkeys.");
      foreach (var k in keys) {
        Keys value=(Keys)k.Key | ((k.Modifiers&1)!=0 ? Keys.Alt : Keys.None) | ((k.Modifiers&2)!=0 ? Keys.Control : Keys.None) | ((k.Modifiers&4)!=0 ? Keys.Shift : Keys.None);
        var normalized=From(value); if (normalized.Modifiers!=k.Modifiers) throw new InvalidOperationException("Ungültiger Hotkey.");
      }
    }
  }
  public static class Transfer {
    public static async Task<Dictionary<string,object>> One(Api api,Outbox outbox) {
      if(outbox.Items.Count==0)throw new InvalidOperationException("Keine Eingabe vorgemerkt.");
      var item=outbox.Items[0];
      if(!String.IsNullOrEmpty(item.Error))throw new InvalidOperationException(item.Error);
      try {await api.Mutate(item);}
      catch(ApiFailure error){if(!error.Transient && !error.Expired)outbox.Block(item.Id,error.Message);throw;}
      // A failed read after a successful mutation MUST NOT mark it rejected.
      // Keep the original id for retry until the confirmed snapshot is loaded.
      var snapshot=await api.Snapshot();outbox.Acknowledge(item.Id);return snapshot;
    }
  }
  public static class Native {
    public const int Message=0x0312;
    [DllImport("user32.dll",SetLastError=true)] public static extern bool RegisterHotKey(IntPtr handle,int id,uint modifiers,uint key);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr handle,int id);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr handle,int message,IntPtr wParam,IntPtr lParam);
  }
  public sealed class TrackerForm : Form {
    readonly Color bg=Color.FromArgb(16,27,34),panel=Color.FromArgb(21,35,44),ink=Color.FromArgb(238,233,221),muted=Color.FromArgb(160,173,175),accent=Color.FromArgb(239,136,87);
    readonly string folder=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"PirateTokenTrackerHotkeys");
    ComboBox email;
    TextBox password;
    Label state,total,detail;
    Button login,activate,add,undo,rejected;
    CheckBox sounds;
    TextBox[] keyBoxes=new TextBox[3];
    Hotkey[] keys=new [] {Hotkey.From(Keys.F8),Hotkey.From(Keys.F9),Hotkey.From(Keys.F10)};
    Api api;
    Outbox outbox;
    Dictionary<string,object> snapshot;
    string actor="",lastError="";
    bool busy,armed,paused,closing;
    NotifyIcon tray;
    System.Windows.Forms.Timer timer;
    string settingsPath {get{return Path.Combine(folder,"hotkeys.json");}}
    public TrackerForm(bool preview=false) {
      Text="Pirate Token · Ingame-Hotkeys"; ClientSize=new Size(590,700); MinimumSize=new Size(600,740); AutoScaleMode=AutoScaleMode.Dpi; BackColor=bg; ForeColor=ink; Font=new Font("Segoe UI",10); StartPosition=FormStartPosition.CenterScreen; Icon=SystemIcons.Application;
      var stack=new TableLayoutPanel {Dock=DockStyle.Fill,Padding=new Padding(26,20,26,18),ColumnCount=1,RowCount=10,AutoScroll=true};
      stack.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100)); Controls.Add(stack);
      stack.Controls.Add(LabelOf("PIRATE TOKEN / WINDOWS-HELFER",10,accent),0,0);
      stack.Controls.Add(LabelOf("Zählen. Ohne Alt-Tab.",25,ink),0,1);
      stack.Controls.Add(LabelOf("Im Spiel eine Taste drücken. Der Helfer überträgt deine Truhen.",10,muted),0,2);
      var auth=new TableLayoutPanel {Dock=DockStyle.Top,AutoSize=true,ColumnCount=2,Padding=new Padding(0,14,0,8)};
      auth.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100)); auth.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,145));
      email=new ComboBox {Dock=DockStyle.Fill,DropDownStyle=ComboBoxStyle.DropDown,Margin=new Padding(0,0,10,8),AccessibleName="Tracker-E-Mail"};
      email.Items.AddRange(new object[]{"schafermax809@gmail.com","shimounexd@gmail.com"}); email.SelectedIndex=0; StyleInput(email);
      password=new TextBox {Dock=DockStyle.Fill,UseSystemPasswordChar=true,Margin=new Padding(0,0,10,8),AccessibleName="Tracker-Passwort"}; StyleInput(password);
      login=ButtonOf("Anmelden",async delegate {await Login();});
      var passLink=ButtonOf("Passwort vergessen",delegate {Open("https://schafermax809-arch.github.io/pirate-token-tracker/account.html#reset");}); passLink.Font=new Font(Font.FontFamily,8);
      auth.Controls.Add(email,0,0);auth.Controls.Add(passLink,1,0);auth.Controls.Add(password,0,1);auth.Controls.Add(login,1,1);stack.Controls.Add(auth,0,3);
      var readout=new Panel {BackColor=panel,Dock=DockStyle.Top,Height=112,Padding=new Padding(16)};
      state=LabelOf("Bitte mit deinem Tracker-Account anmelden.",10,accent); state.Dock=DockStyle.Top;
      total=LabelOf("— TRUHEN",28,ink);total.Dock=DockStyle.Top;
      readout.Controls.Add(total);readout.Controls.Add(state);stack.Controls.Add(readout,0,4);
      var bindings=new TableLayoutPanel {ColumnCount=2,Dock=DockStyle.Top,AutoSize=true,Padding=new Padding(0,16,0,8)};
      bindings.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,55));bindings.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,45));
      string[] names={"+1 Truhe","Letzten eigenen Klick zurücknehmen","Pause / Fortsetzen"};
      try {if(File.Exists(settingsPath)){var loaded=Json.Codec.Deserialize<Hotkey[]>(File.ReadAllText(settingsPath));Hotkey.Validate(loaded);keys=loaded;}}catch{}
      for(int i=0;i<3;i++) {
        int index=i; var box=new TextBox {ReadOnly=true,Dock=DockStyle.Fill,Text=keys[i].Label,Margin=new Padding(6,4,0,4),AccessibleName=names[i]+" Hotkey"};StyleInput(box); keyBoxes[i]=box;
        box.KeyDown+=delegate(object sender,KeyEventArgs e) { if(e.KeyCode==Keys.Tab)return; e.SuppressKeyPress=true;if(e.KeyCode==Keys.Escape){activate.Focus();return;}if(e.KeyCode==Keys.ControlKey||e.KeyCode==Keys.ShiftKey||e.KeyCode==Keys.Menu)return;try{keys[index]=Hotkey.From(e.KeyData);box.Text=keys[index].Label;Notice("Hotkeys mit Aktivieren übernehmen.",false);}catch(Exception error){Notice(error.Message,true);} };
        bindings.Controls.Add(LabelOf(names[i],10,ink),0,i);bindings.Controls.Add(box,1,i);
      }
      stack.Controls.Add(bindings,0,5);
      activate=ButtonOf("Hotkeys aktivieren",ToggleArmed);activate.BackColor=accent;activate.ForeColor=bg;activate.Enabled=false;activate.Height=43;stack.Controls.Add(activate,0,6);
      var actions=new FlowLayoutPanel {Dock=DockStyle.Top,AutoSize=true,Margin=new Padding(0,10,0,4),WrapContents=true};
      add=ButtonOf("+1 testen",delegate{Increment();});undo=ButtonOf("Rückgängig",async delegate{await Undo();});rejected=ButtonOf("Konflikt archivieren",ArchiveConflict);
      add.Enabled=undo.Enabled=rejected.Enabled=false;actions.Controls.Add(add);actions.Controls.Add(undo);actions.Controls.Add(rejected);stack.Controls.Add(actions,0,7);
      sounds=new CheckBox {AutoSize=true,Text="Ton bei gespeicherten Klicks und Fehlern",Checked=true,ForeColor=muted,Margin=new Padding(0,8,0,8)};stack.Controls.Add(sounds,0,8);
      detail=LabelOf("Tastenfeld anklicken und F1–F11 oder Strg/Alt + Taste drücken.\nAktivieren, minimieren, spielen. F10 pausiert die Zähl-Hotkeys.\nDein Passwort und die Anmeldung bleiben nur im Arbeitsspeicher.",9,muted);detail.MaximumSize=new Size(535,0);stack.Controls.Add(detail,0,9);
      AcceptButton=login;
      tray=new NotifyIcon {Icon=Icon,Text="Pirate Token · Hotkeys inaktiv",Visible=!preview};
      tray.DoubleClick+=delegate{Show();WindowState=FormWindowState.Normal;Activate();};
      tray.ContextMenuStrip=new ContextMenuStrip();tray.ContextMenuStrip.Items.Add("Fenster öffnen",null,delegate{Show();WindowState=FormWindowState.Normal;Activate();});tray.ContextMenuStrip.Items.Add("Pause / Fortsetzen",null,delegate{TogglePause();});tray.ContextMenuStrip.Items.Add("Beenden",null,delegate{Close();});
      Resize+=delegate{if(WindowState==FormWindowState.Minimized){Hide();tray.ShowBalloonTip(1800,"Pirate Token läuft weiter",armed ? "Hotkeys bleiben im Hintergrund verfügbar. F10: Pause/Fortsetzen (Standard)." : "Hotkeys sind noch nicht aktiviert.",ToolTipIcon.Info);}};
      FormClosing+=OnClosing;
      timer=new System.Windows.Forms.Timer {Interval=10000};timer.Tick+=async delegate{await Pump();};if(!preview)timer.Start();
    }
    Label LabelOf(string text,float size,Color color) {return new Label {Text=text,AutoSize=true,ForeColor=color,Font=new Font("Segoe UI",size,size>=20 ? FontStyle.Bold : FontStyle.Regular),Margin=new Padding(0,4,0,7)};}
    Button ButtonOf(string text,Action action) {var b=new Button {Text=text,AutoSize=true,MinimumSize=new Size(100,34),FlatStyle=FlatStyle.Flat,BackColor=panel,ForeColor=ink,Margin=new Padding(0,0,7,4),Padding=new Padding(7,2,7,2)};b.FlatAppearance.BorderColor=Color.FromArgb(80,96,104);b.Click+=delegate{action();};return b;}
    void StyleInput(Control c) {c.BackColor=panel;c.ForeColor=ink;}
    static void Open(string url) {System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url){UseShellExecute=true});}
    void Notice(string message,bool error) {
      if(closing)return;detail.Text=message;detail.ForeColor=error ? Color.FromArgb(241,164,154) : muted;
      bool newError=error && message!=lastError;lastError=error ? message : "";
      if(newError && sounds.Checked)System.Media.SystemSounds.Exclamation.Play();
      if(newError && !Visible)tray.ShowBalloonTip(2000,"Pirate Token · Eingabe prüfen",message,ToolTipIcon.Warning);
    }
    void UpdateView() {
      bool connected=api!=null && snapshot!=null;
      login.Text=connected ? "Abmelden" : "Anmelden";email.Enabled=password.Enabled=!connected && !busy;
      activate.Enabled=connected;add.Enabled=undo.Enabled=connected;
      if(connected) {
        var p=Json.Rows(snapshot,"players").First(x=>Json.Text(x,"id")==actor);
        total.Text=Json.Number(p,"total").ToString("N0",System.Globalization.CultureInfo.GetCultureInfo("de-DE"))+" TRUHEN";
        state.Text=(actor=="max" ? "MAX" : "SZYMON")+" · "+(outbox.Items.Count==0 ? "Alles übertragen" : outbox.Items.Count+" Eingabe(n) vorgemerkt")+" · "+(!armed ? "Hotkeys aus" : paused ? "PAUSIERT" : "HOTKEYS AKTIV");
      } else {state.Text="Bitte anmelden · Hotkeys inaktiv";total.Text="— TRUHEN";}
      activate.Text=armed ? "Hotkeys deaktivieren" : "Hotkeys aktivieren";
      foreach(var box in keyBoxes)box.Enabled=!armed;
      rejected.Enabled=connected && outbox.Items.Count>0 && !String.IsNullOrEmpty(outbox.Items[0].Error) && !busy;
      tray.Text="Pirate Token · "+(!armed ? "Hotkeys inaktiv" : paused ? "pausiert" : "Hotkeys aktiv");
    }
    async Task Login() {
      if(busy)return;
      if(api!=null && snapshot!=null) {
        if(outbox.Items.Count>0){Notice("Vor dem Abmelden erst offene Eingaben übertragen oder Konflikte prüfen. Beim Beenden bleibt der Puffer erhalten.",true);return;}
        Disarm();busy=true;try{await api.Logout();api=null;snapshot=null;actor="";Notice("Abgemeldet.",false);}catch(Exception error){Notice(error.Message,true);}finally{busy=false;UpdateView();}return;
      }
      if(String.IsNullOrWhiteSpace(email.Text)||password.Text.Length==0){Notice("Tracker-E-Mail und Passwort eingeben.",true);return;}
      busy=true;login.Enabled=false;UpdateView();Api candidate=new Api();
      try {
        await candidate.Login(email.Text.Trim(),password.Text);password.Clear();
        var next=await candidate.Snapshot();string nextActor=Rules.Actor(next,candidate.UserId);
        var queue=new Outbox(Path.Combine(folder,candidate.UserId+".queue.json"));
        api=candidate;snapshot=next;actor=nextActor;outbox=queue;Notice("Angemeldet. Hotkeys aktivieren und das Fenster minimieren. Der Browser kann geschlossen werden.",false);
      } catch(Exception error){candidate.Dispose();Notice(error.Message,true);}
      finally{password.Clear();busy=false;login.Enabled=true;UpdateView();}
      await Pump();
    }
    void ToggleArmed() {
      if(armed){Disarm();UpdateView();Notice("Hotkeys freigegeben. Die Tasten funktionieren wieder normal.",false);return;}
      if(api==null||snapshot==null)return;
      try {
        Hotkey.Validate(keys);
        for(int i=0;i<3;i++)if(!Native.RegisterHotKey(Handle,i+1,keys[i].Modifiers|0x4000,keys[i].Key))throw new InvalidOperationException(keys[i].Label+" wird von Windows oder einem anderen Programm verwendet. Bitte eine andere Taste wählen.");
        Directory.CreateDirectory(folder);File.WriteAllText(settingsPath,Json.Codec.Serialize(keys),Encoding.UTF8);armed=true;paused=false;UpdateView();Notice("Aktiv: "+keys[0].Label+" zählt +1, "+keys[1].Label+" nimmt einen Klick zurück, "+keys[2].Label+" pausiert. Jetzt minimieren und spielen.",false);
      }catch(Exception error){Disarm();UpdateView();Notice(error.Message,true);}
    }
    void Disarm() {for(int i=1;i<=3;i++)Native.UnregisterHotKey(Handle,i);armed=paused=false;}
    void TogglePause() {if(!armed)return;paused=!paused;UpdateView();Notice(paused ? "Zählen pausiert. Mit "+keys[2].Label+" fortsetzen." : "Zählen wieder aktiv.",false);}
    protected override void WndProc(ref Message message) {
      if(message.Msg==Native.Message && armed) {int id=message.WParam.ToInt32();if(id==3)TogglePause();else if(!paused){if(id==1)Increment();else if(id==2)RunUndo();}return;}
      base.WndProc(ref message);
    }
    async void RunUndo(){await Undo();}
    void Increment() {
      if(api==null||snapshot==null)return;
      try {
        if(outbox.Items.Any(x=>!String.IsNullOrEmpty(x.Error)))throw new InvalidOperationException("Erst den abgelehnten Eintrag über Konflikt archivieren prüfen.");
        if(outbox.Items.Any(x=>x.Action!="increment"))throw new InvalidOperationException("Rückgängig wird noch übertragen. Kurz warten.");
        outbox.Add(Rules.Make(snapshot,actor,false));UpdateView();Notice("+1 lokal vorgemerkt. Wird übertragen.",false);RunPump();
      }catch(Exception error){Notice("Nicht vorgemerkt: "+error.Message,true);}
    }
    async void RunPump(){await Pump();}
    async Task Undo() {
      if(api==null||snapshot==null)return;
      if(busy||outbox.Items.Count>0){Notice("Rückgängig erst nach Übertragung aller Eingaben. Kurz warten.",true);return;}
      busy=true;
      try {snapshot=await api.Snapshot();if(outbox.Items.Count>0)throw new InvalidOperationException("Neue Eingabe wartet noch auf Übertragung. Rückgängig danach erneut drücken.");outbox.Add(Rules.Make(snapshot,actor,true));UpdateView();Notice("Rückgängig vorgemerkt.",false);}
      catch(Exception error){HandleFailure(error);}finally{busy=false;UpdateView();}
      await Pump();
    }
    async Task Pump() {
      if(busy||api==null||snapshot==null||closing)return;
      busy=true;
      try {
        if(outbox.Items.Count==0){snapshot=await api.Snapshot();UpdateView();return;}
        while(outbox.Items.Count>0 && !closing) {
          Pending item=outbox.Items[0];if(!String.IsNullOrEmpty(item.Error)){Notice(item.Error+" · Konflikt archivieren, dann erneut versuchen.",true);break;}
          snapshot=await Transfer.One(api,outbox);UpdateView();Notice("Gespeichert. "+(outbox.Items.Count==0 ? "Alle Eingaben übertragen." : outbox.Items.Count+" Eingabe(n) folgen."),false);if(sounds.Checked)System.Media.SystemSounds.Beep.Play();
        }
      }catch(Exception error){HandleFailure(error);}finally{busy=false;if(!closing)UpdateView();}
    }
    void HandleFailure(Exception error) {
      var apiError=error as ApiFailure;
      if(apiError!=null && apiError.Expired){Disarm();if(api!=null)api.Dispose();api=null;snapshot=null;Notice("Anmeldung abgelaufen. Neu anmelden; offene Eingaben bleiben im Puffer.",true);}
      else Notice(error.Message,true);
    }
    void ArchiveConflict() {
      if(busy||outbox==null||outbox.Items.Count==0)return;
      if(MessageBox.Show(this,"Diese Eingabe wurde vom Server sicher abgelehnt und nicht gezählt. Im lokalen Fehlerjournal sichern und aus dem Puffer nehmen?","Konflikt archivieren",MessageBoxButtons.OKCancel,MessageBoxIcon.Warning)!=DialogResult.OK)return;
      try{outbox.ArchiveRejected();UpdateView();Notice("Abgelehnte Eingabe im Fehlerjournal gesichert. Neue Zählung bei Bedarf erneut ausführen.",false);RunPump();}catch(Exception error){Notice(error.Message,true);}
    }
    void OnClosing(object sender,FormClosingEventArgs e) {
      if(!closing && outbox!=null && outbox.Items.Count>0 && MessageBox.Show(this,"Es sind noch "+outbox.Items.Count+" Eingaben offen. Sie bleiben lokal gespeichert und werden nach der nächsten Anmeldung mit demselben Account erneut übertragen. Helfer beenden?","Offene Eingaben",MessageBoxButtons.YesNo,MessageBoxIcon.Information)!=DialogResult.Yes){e.Cancel=true;return;}
      closing=true;timer.Stop();Disarm();tray.Visible=false;tray.Dispose();if(api!=null)api.Dispose();
    }
  }
  static class Program {
    [STAThread] static int Main(string[] args) {
      if(args.Length>0 && args[0]=="--self-test")return SelfTests.Run(args.Length>1 ? args[1] : "hotkeys-tests.txt");
      Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
      if(args.Length>1 && args[0]=="--render-preview") {
        using(var form=new TrackerForm(true)){form.StartPosition=FormStartPosition.Manual;form.Location=new Point(-30000,-30000);form.ShowInTaskbar=false;form.Show();Application.DoEvents();using(var bitmap=new Bitmap(form.Width,form.Height)){form.DrawToBitmap(bitmap,new Rectangle(0,0,form.Width,form.Height));bitmap.Save(args[1],System.Drawing.Imaging.ImageFormat.Png);}form.Close();}
        return 0;
      }
      bool created;using(var instance=new Mutex(true,"Local\\PirateTokenTrackerHotkeys",out created)) {
        if(!created){MessageBox.Show("Der Hotkey-Helfer läuft bereits. Unten rechts im Infobereich öffnen.","Pirate Token");return 0;}
        Application.Run(new TrackerForm());
      }
      return 0;
    }
  }
}
