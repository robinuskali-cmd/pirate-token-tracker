using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace PirateTokenHotkeys {
  public sealed class FakeHttp : HttpMessageHandler {
    public Func<HttpRequestMessage,Task<HttpResponseMessage>> Reply;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,CancellationToken cancellation) {return Reply(request);}
    public static HttpResponseMessage Response(int status,object data){return new HttpResponseMessage((HttpStatusCode)status){Content=new StringContent(Json.Codec.Serialize(data),Encoding.UTF8,"application/json")};}
  }
  public static class SelfTests {
    const string Uid="00000000-0000-0000-0000-000000000001";
    static List<string> lines=new List<string>();
    static string folder;
    static Dictionary<string,object> Map(params object[] pairs){var d=new Dictionary<string,object>();for(int i=0;i<pairs.Length;i+=2)d[(string)pairs[i]]=pairs[i+1];return d;}
    static Dictionary<string,object> State() {return Map("players",new object[]{Map("id","max","auth_id",Uid,"total",500),Map("id","szymon","auth_id","other","total",1100)},"sessions",new object[0],"rounds",new object[0],"counts",new object[0],"changes",new object[0]);}
    static object Session(string user=Uid,string access="fake-access"){return new {access_token=access,refresh_token="fake-refresh",expires_in=3600,user=new{id=user}};}
    static void Assert(bool condition,string message){if(!condition)throw new Exception(message);}
    static void Throws(Action action,string message){bool threw=false;try{action();}catch{threw=true;}Assert(threw,message);}
    static string FileFor(string name){return Path.Combine(folder,name+".json");}
    static void Test(string name,Action action){try{action();lines.Add("PASS "+name);}catch(Exception e){lines.Add("FAIL "+name+": "+e.GetBaseException().Message);}}
    static void Async(string name,Func<Task> action){Test(name,()=>{SynchronizationContext.SetSynchronizationContext(null);action().GetAwaiter().GetResult();});}
    sealed class MessageWindow : NativeWindow,IDisposable {
      public int Received;
      public MessageWindow(){CreateHandle(new CreateParams());}
      protected override void WndProc(ref Message message){if(message.Msg==Native.Message)Received++;base.WndProc(ref message);}
      public void Dispose(){DestroyHandle();}
    }
    public static int Run(string report) {
      folder=Path.Combine(Path.GetDirectoryName(Path.GetFullPath(report)),"hotkey-testdata-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(folder);
      Test("Eigener Account wird aus auth_id zugeordnet; fremder Account abgelehnt",()=>{Assert(Rules.Actor(State(),Uid)=="max","Max falsch");Assert(Rules.Actor(State(),"other")=="szymon","Szymon falsch");Throws(()=>Rules.Actor(State(),"unknown"),"Unzugeordneter Account erlaubt");});
      Test("+1 ohne Session, mit eindeutiger Kennung und eigenem Spieler",()=>{var a=Rules.Make(State(),"max",false);var b=Rules.Make(State(),"max",false);Assert(a.Id!=b.Id && a.Action=="increment" && Json.Text(a.Payload,"player_id")=="max" && Json.Number(a.Payload,"delta")==1 && a.Payload["round_id"]==null,"Falsche Anfrage");});
      Test("Aktive Session verlangt Runde; aktive Runde behält Revision",()=>{var s=State();s["sessions"]=new object[]{Map("id","s","ended_at",null)};Throws(()=>Rules.Make(s,"max",false),"Session ohne Runde erlaubt");s["rounds"]=new object[]{Map("id","r","ended_at",null)};s["counts"]=new object[]{Map("round_id","r","player_id","max","revision",4)};var p=Rules.Make(s,"max",false);Assert(Json.Text(p.Payload,"round_id")=="r" && Json.Number(p.Payload,"expected_revision")==4,"Rundenrevision verloren");});
      Test("Undo überspringt fremde und bereits rückgängig gemachte Klicks",()=>{var s=State();s["changes"]=new object[]{Map("id","foreign","player_id","szymon","reason","live","delta",1),Map("id","done","player_id","max","reason","live","delta",1),Map("id","rev","player_id","max","reason","undo","delta",-1,"reversal_of","done"),Map("id","own","player_id","max","reason","live","delta",1)};Assert(Json.Text(Rules.Make(s,"max",true).Payload,"change_id")=="own","Falsches Undo-Ziel");});
      Test("Abgeschlossene und korrigierte Runden erlauben kein schnelles Undo",()=>{var s=State();s["changes"]=new object[]{Map("id","click","round_id","r","round_revision",0,"player_id","max","reason","live","delta",1)};s["rounds"]=new object[]{Map("id","r","ended_at","closed")};s["counts"]=new object[]{Map("round_id","r","player_id","max","revision",0)};Throws(()=>Rules.Make(s,"max",true),"Geschlossenes Undo erlaubt");s["rounds"]=new object[]{Map("id","r","ended_at",null)};s["counts"]=new object[]{Map("round_id","r","player_id","max","revision",1)};Throws(()=>Rules.Make(s,"max",true),"Korrigiertes Undo erlaubt");});
      Test("Puffer übersteht Neustart und behält exakt dieselbe Kennung",()=>{string file=FileFor("restart");var box=new Outbox(file);var p=Rules.Make(State(),"max",false);box.Add(p);var reload=new Outbox(file);Assert(reload.Items.Count==1 && reload.Items[0].Id==p.Id,"Puffer verloren");reload.Acknowledge(p.Id);Assert(new Outbox(file).Items.Count==0,"ACK nicht gespeichert");});
      Test("Schreibfehler quittiert keinen neuen Klick als vorgemerkt",()=>{string path=Path.Combine(folder,"target-is-directory");Directory.CreateDirectory(path);var box=new Outbox(path);Throws(()=>box.Add(Rules.Make(State(),"max",false)),"Schreibfehler verschluckt");Assert(box.Items.Count==0,"Speicherfehler wurde quittiert");});
      Test("Abgelehnte Einträge werden vor Entfernung archiviert; unklare bleiben erhalten",()=>{var box=new Outbox(FileFor("conflict"));var p=Rules.Make(State(),"max",false);box.Add(p);Throws(()=>box.ArchiveRejected(),"Unklare Anfrage entfernt");box.Block(p.Id,"Runde geändert");box.ArchiveRejected();Assert(box.Items.Count==0 && File.ReadAllText(FileFor("conflict")+".rejected.jsonl").Contains(p.Id),"Fehlerjournal fehlt");});
      Test("Hotkeys: F-Tasten, Kombinationen, Konflikte und reservierte Tasten",()=>{Assert(Hotkey.From(Keys.F8).Label=="F8","Standard falsch");Assert(Hotkey.From(Keys.Control|Keys.Shift|Keys.K).Modifiers==6,"Modifier falsch");Throws(()=>Hotkey.From(Keys.W),"W ohne Modifier erlaubt");Throws(()=>Hotkey.From(Keys.F12),"F12 erlaubt");Throws(()=>Hotkey.Validate(new[]{Hotkey.From(Keys.F8),Hotkey.From(Keys.F8),Hotkey.From(Keys.F10)}),"Konflikt erlaubt");Hotkey.Validate(new[]{Hotkey.From(Keys.F8),Hotkey.From(Keys.F9),Hotkey.From(Keys.F10)});});
      Test("Windows: RegisterHotKey, eigene WM_HOTKEY-Nachricht, Freigabe",()=>{using(var window=new MessageWindow()){Assert(Native.RegisterHotKey(window.Handle,76,0x4000|1|2|4,(uint)Keys.F11),"Testkombination schon belegt oder RegisterHotKey fehlgeschlagen");try{Native.PostMessage(window.Handle,Native.Message,new IntPtr(76),IntPtr.Zero);Application.DoEvents();Assert(window.Received==1,"WM_HOTKEY nicht empfangen");}finally{Assert(Native.UnregisterHotKey(window.Handle,76),"Freigabe fehlgeschlagen");}}});
      Async("Verlorene Serverantwort: Retry mit gleicher UUID zählt im simulierten Server nur einmal",async()=>{
        var applied=new HashSet<string>();bool lose=true;int total=500;
        var fake=new FakeHttp();fake.Reply=async req=>{string raw=await req.Content.ReadAsStringAsync();if(req.RequestUri.AbsolutePath.Contains("token"))return FakeHttp.Response(200,Session());if(req.RequestUri.AbsolutePath.EndsWith("tracker_mutate")){var d=Json.Map(Json.Codec.DeserializeObject(raw));string id=Json.Text(d,"p_request_id");if(applied.Add(id))total++;if(lose){lose=false;throw new HttpRequestException("lost");}return FakeHttp.Response(200,new {ok=true,duplicate=true});}return FakeHttp.Response(200,State());};
        using(var api=new Api(fake)){await api.Login("test@example.com","fake-only");var box=new Outbox(FileFor("lost-response"));var p=Rules.Make(State(),"max",false);box.Add(p);try{await Transfer.One(api,box);}catch(ApiFailure){}Assert(box.Items.Count==1 && box.Items[0].Id==p.Id && box.Items[0].Error==null,"Unklare Anfrage verloren");await Transfer.One(api,box);Assert(total==501 && box.Items.Count==0,"Doppelt gezählt");}
      });
      Async("Fehlgeschlagener Snapshot nach Commit bleibt unbestätigt und wird nicht als abgelehnt markiert",async()=>{
        var fake=new FakeHttp();fake.Reply=req=>Task.FromResult(req.RequestUri.AbsolutePath.Contains("token") ? FakeHttp.Response(200,Session()) : req.RequestUri.AbsolutePath.EndsWith("tracker_mutate") ? FakeHttp.Response(200,new{ok=true}) : FakeHttp.Response(403,new{code="42501",message="Read rejected"}));
        using(var api=new Api(fake)){await api.Login("test@example.com","fake");var box=new Outbox(FileFor("failed-read"));box.Add(Rules.Make(State(),"max",false));try{await Transfer.One(api,box);}catch(ApiFailure){}Assert(box.Items.Count==1 && box.Items[0].Error==null,"Bestätigte Mutation wurde falsch als abgelehnt markiert");}
      });
      Async("Sicher abgelehnte Mutation bleibt blockiert im dauerhaften Puffer",async()=>{
        var fake=new FakeHttp();fake.Reply=req=>Task.FromResult(req.RequestUri.AbsolutePath.Contains("token") ? FakeHttp.Response(200,Session()) : FakeHttp.Response(400,new{code="P0001",message="Runde abgeschlossen"}));
        using(var api=new Api(fake)){await api.Login("test@example.com","fake");string file=FileFor("server-conflict");var box=new Outbox(file);box.Add(Rules.Make(State(),"max",false));try{await Transfer.One(api,box);}catch(ApiFailure){}Assert(new Outbox(file).Items[0].Error=="Runde abgeschlossen","Konflikt nicht gespeichert");}
      });
      Async("Abgelaufenes Zugriffstoken wird erneuert; Kennung bleibt identisch",async()=>{
        int calls=0,refreshes=0;string first="";
        var fake=new FakeHttp();fake.Reply=async req=>{if(req.RequestUri.Query.Contains("grant_type=password"))return FakeHttp.Response(200,Session());if(req.RequestUri.Query.Contains("grant_type=refresh_token")){refreshes++;return FakeHttp.Response(200,Session(Uid,"fresh"));}if(req.RequestUri.AbsolutePath.EndsWith("tracker_mutate")){string raw=await req.Content.ReadAsStringAsync();if(calls++==0){first=raw;return FakeHttp.Response(401,new{message="expired"});}Assert(raw==first && req.Headers.Authorization.Parameter=="fresh","Retry verändert Kennung oder Token nicht erneuert");return FakeHttp.Response(200,new{ok=true});}return FakeHttp.Response(200,State());};
        using(var api=new Api(fake)){await api.Login("test@example.com","fake");var box=new Outbox(FileFor("refresh"));box.Add(Rules.Make(State(),"max",false));await Transfer.One(api,box);Assert(refreshes==1 && calls==2 && box.Items.Count==0,"Refresh fehlgeschlagen");}
      });
      Async("Benutzerwechsel bei Token-Erneuerung wird abgelehnt; Queue bleibt erhalten",async()=>{
        var fake=new FakeHttp();fake.Reply=req=>Task.FromResult(req.RequestUri.Query.Contains("grant_type=password") ? FakeHttp.Response(200,Session()) : req.RequestUri.Query.Contains("grant_type=refresh_token") ? FakeHttp.Response(200,Session("different")) : FakeHttp.Response(401,new{message="expired"}));
        using(var api=new Api(fake)){await api.Login("test@example.com","fake");var box=new Outbox(FileFor("wrong-user"));box.Add(Rules.Make(State(),"max",false));bool expired=false;try{await Transfer.One(api,box);}catch(ApiFailure e){expired=e.Expired;}Assert(expired && box.Items.Count==1 && box.Items[0].Error==null,"Fremde Sitzung akzeptiert oder Queue verloren");}
      });
      Async("Abmelden betrifft nur die Helfer-Sitzung",async()=>{string query="";var fake=new FakeHttp();fake.Reply=req=>{if(req.RequestUri.AbsolutePath.EndsWith("logout")){query=req.RequestUri.Query;return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent){Content=new StringContent("")});}return Task.FromResult(FakeHttp.Response(200,Session()));};using(var api=new Api(fake)){await api.Login("test@example.com","fake");await api.Logout();Assert(query=="?scope=local","Globale Abmeldung angefordert");}});
      int failed=lines.Count(x=>x.StartsWith("FAIL"));lines.Add((lines.Count-failed)+" passed; "+failed+" failed. No real credentials or cloud mutations used.");File.WriteAllLines(report,lines,Encoding.UTF8);return failed==0 ? 0 : 1;
    }
  }
}
