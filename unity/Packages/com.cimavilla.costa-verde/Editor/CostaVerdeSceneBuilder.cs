using System;
using System.IO;
using Cimavilla.Minigames.CostaVerde;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.UI;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Cimavilla.CostaVerde.Editor
{
    public static class CostaVerdeSceneBuilder
    {
        private const string Package = "Packages/com.cimavilla.costa-verde/";
        [Serializable] private sealed class Layout { public float width,height; public Box[] elements,lamps; }
        [Serializable] private sealed class Box { public string name,color; public float x,y,width,height,fontSize; public int phase; }
        private static Font sans, condensed, italic;

        [MenuItem("Cimavilla/Costa Verde/Crear escena de prueba")]
        public static void Create()
        {
            if (EditorApplication.isPlaying) throw new InvalidOperationException("Sal del modo Play antes de crear la escena.");
            var pipeline = GraphicsSettings.currentRenderPipeline;
            if (!pipeline || !pipeline.GetType().Name.Contains("Universal"))
                Debug.LogWarning("Costa Verde: utiliza un proyecto Unity 6 con Universal Render Pipeline para validar el port.");
            Directory.CreateDirectory("Assets/CimavillaSamples"); AssetDatabase.Refresh();
            string folder = AssetDatabase.GenerateUniqueAssetPath("Assets/CimavillaSamples/CostaVerde");
            Directory.CreateDirectory(folder); AssetDatabase.Refresh();
            var previousScene = SceneManager.GetActiveScene();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Additive);
            SceneManager.SetActiveScene(scene);
            sans = Load<Font>("Fonts/dm-sans-normal-400.ttf");
            condensed = Load<Font>("Fonts/barlow-condensed-normal-600.ttf");
            italic = Load<Font>("Fonts/cormorant-garamond-italic-600.ttf");
            var layout = JsonUtility.FromJson<Layout>(Load<TextAsset>("Data/cabinet-layout.json").text);
            var actions = InputActionAsset.FromJson(Load<TextAsset>("Data/input-actions.json").text);
            AssetDatabase.CreateAsset(actions,folder+"/CostaVerdeInput.asset");
            var material = new Material(Load<Shader>("Runtime/Unity/MechanicalReel.shader"));
            AssetDatabase.CreateAsset(material,folder+"/MechanicalReel.mat");

            var camera = new GameObject("Preview camera",typeof(Camera),typeof(AudioListener));
            camera.tag = "MainCamera"; camera.GetComponent<Camera>().backgroundColor = new Color(.02f,.04f,.03f);
            camera.GetComponent<Camera>().clearFlags = CameraClearFlags.SolidColor;
            var eventSystem = new GameObject("EventSystem",typeof(EventSystem),typeof(InputSystemUIInputModule));
            eventSystem.GetComponent<InputSystemUIInputModule>().AssignDefaultActions();
            var root = new GameObject("Costa Verde 2000",typeof(RectTransform),typeof(Canvas),typeof(GraphicRaycaster));
            root.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var controller = root.AddComponent<CostaVerdeController>();
            var view = root.AddComponent<CostaVerdeView>(); var sound = root.AddComponent<MachineSound>();
            controller.view = view; controller.sound = sound; controller.inputActions = actions;
            var background = Raw("Chigre",root.transform,new Rect(),Load<Texture2D>("Art/chigre.jpg"));
            Stretch(background.rectTransform);
            var tint = Panel("Vignette",root.transform,new Rect(),new Color(.018f,.035f,.027f,.78f)); Stretch((RectTransform)tint.transform);
            var content = RectObject("Composition",root.transform,new Rect(0,0,1440,1034));
            var cr = (RectTransform)content.transform; cr.anchorMin = cr.anchorMax = cr.pivot = new Vector2(.5f,.5f); cr.anchoredPosition = Vector2.zero;
            content.AddComponent<FitReferenceCanvas>();
            Label("CIMAVILLA",content.transform,new Rect(80,36,280,36),sans,19,new Color(.91f,.85f,.69f));
            Label("HISTORIAS DE BARRIO · 1992",content.transform,new Rect(80,75,330,24),condensed,10,new Color(.60f,.59f,.51f));
            Label("EL RINCÓN DEL AZAR",content.transform,new Rect(94,205,400,28),condensed,11,new Color(.78f,.68f,.48f));
            Label("Todavía queda\nnoche.",content.transform,new Rect(88,244,520,188),italic,72,new Color(.95f,.92f,.82f));
            Label("Fuera llueve. Dentro, la noche es joven.\nY la Costa Verde todavía tiene algo que decir.",content.transform,new Rect(94,439,470,64),sans,14,new Color(.66f,.68f,.62f));
            Label("EN TU BOLSILLO",content.transform,new Rect(94,558,290,26),condensed,11,new Color(.72f,.63f,.46f));
            view.wallet = Label("500 pts.",content.transform,new Rect(94,587,410,65),italic,48,new Color(.92f,.87f,.72f));
            view.stats = Label("",content.transform,new Rect(94,694,410,70),condensed,16,new Color(.70f,.67f,.56f));
            Label("M  mete moneda    ESPACIO  juega\nA / S / D  retén o avanza    C  cobra\nP  pausa    H  ayuda    V  sonido",content.transform,new Rect(94,797,470,92),sans,12,new Color(.55f,.57f,.51f));
            view.helpButton = TextButton("CÓMO JUGAR",content.transform,new Rect(1110,38,135,35),out _);
            view.soundButton = TextButton("SONIDO: ON",content.transform,new Rect(1250,38,130,35),out view.soundLabel);
            view.exitButton = TextButton("VOLVER AL BARRIO",content.transform,new Rect(80,968,230,36),out _);
            Label("SOLO PESETAS VIRTUALES",content.transform,new Rect(1100,970,280,30),condensed,10,new Color(.57f,.60f,.53f));

            var cabinet = RectObject("Machine",content.transform,new Rect(700,113,layout.width,layout.height));
            Raw("Front",cabinet.transform,new Rect(0,0,layout.width,layout.height),Load<Texture2D>("Art/cabinet-front.png"));
            view.reels = new RawImage[3]; view.holdButtons = new Button[3];
            view.holdLabels = new Text[3]; view.heldLabels = new Text[3]; view.enabledButtons = new RawImage[6];
            for (int i = 0; i < 3; i++)
            {
                view.reels[i] = Raw("Reel "+i,cabinet.transform,Find(layout,"reel"+i),Load<Texture2D>("Art/symbol-atlas.png"));
                view.reels[i].material = material;
                var r = Find(layout,"held"+i);
                var held = Panel("Held "+i,cabinet.transform,r,new Color(.11f,.21f,.16f,.90f));
                view.heldLabels[i] = Label("RETENIDO",held.transform,new Rect(0,0,r.width,r.height),condensed,9,new Color(.91f,.89f,.68f),TextAnchor.MiddleCenter);
                view.enabledButtons[3+i] = Raw("Active hold "+i,cabinet.transform,Find(layout,"hold"+i),Load<Texture2D>("Art/button-hold.png"));
                view.holdButtons[i] = ButtonArea("Hold "+i,cabinet.transform,Find(layout,"hold"+i));
                var label = Find(layout,"holdLabel"+i); label.x -= 10; label.width += 20;
                view.holdLabels[i] = Label("RETENER",cabinet.transform,label,condensed,11,new Color(.89f,.86f,.72f),TextAnchor.MiddleCenter);
            }
            Panel("Payline",cabinet.transform,new Rect(39,432.5f,522,1),new Color(.85f,.72f,.49f,.18f));
            string[] names = {"coin","spin","cash"};
            for (int i = 0; i < 3; i++)
                view.enabledButtons[i] = Raw("Active "+names[i],cabinet.transform,Find(layout,names[i]),Load<Texture2D>("Art/button-"+names[i]+".png"));
            view.coinButton = ButtonArea("Coin",cabinet.transform,Find(layout,"coin"));
            view.spinButton = ButtonArea("Spin",cabinet.transform,Find(layout,"spin"));
            view.cashButton = ButtonArea("Cash",cabinet.transform,Find(layout,"cash"));
            Label("MONEDA\n25 PTS.",cabinet.transform,new Rect(103,668,68,32),condensed,10,new Color(.94f,.88f,.70f),TextAnchor.MiddleCenter);
            Label("JUGAR",cabinet.transform,new Rect(420,665,110,25),condensed,22,new Color(1,.92f,.79f),TextAnchor.MiddleCenter);
            Label("COBRAR",cabinet.transform,new Rect(278,673,62,19),condensed,13,new Color(.24f,.18f,.10f),TextAnchor.MiddleCenter);
            view.credits = Label("00000",cabinet.transform,new Rect(48,598,103,36),condensed,30,new Color(1,.64f,.26f),TextAnchor.MiddleRight);
            view.bank = Label("00000",cabinet.transform,new Rect(450,598,103,36),condensed,30,new Color(1,.64f,.26f),TextAnchor.MiddleRight);
            view.status = Label("",cabinet.transform,new Rect(168,598,264,18),condensed,11,new Color(.91f,.84f,.66f),TextAnchor.MiddleCenter);
            view.hint = Label("",cabinet.transform,new Rect(159,615,282,13),condensed,8,new Color(.62f,.58f,.43f),TextAnchor.MiddleCenter);
            view.marquee = Label("",cabinet.transform,new Rect(90,295,420,23),condensed,12,new Color(1,.69f,.31f),TextAnchor.MiddleCenter);
            view.tray = Label("SU PREMIO, AQUÍ",cabinet.transform,new Rect(243,738,146,15),condensed,8,new Color(.58f,.55f,.41f),TextAnchor.MiddleCenter);
            view.lamps = new RawImage[layout.lamps.Length]; view.lampColors = new Color[layout.lamps.Length]; view.lampPhases = new int[layout.lamps.Length];
            for (int i = 0; i < layout.lamps.Length; i++)
            {
                var b = layout.lamps[i]; float size = b.width*3.4f;
                view.lamps[i] = Raw(b.name,cabinet.transform,new Rect(b.x+(b.width-size)/2,b.y+(b.height-size)/2,size,size),Load<Texture2D>("Art/lamp-glow.png"));
                ColorUtility.TryParseHtmlString(b.color,out view.lampColors[i]); view.lampPhases[i] = b.phase;
            }
            view.winPanel = Panel("Prize",cabinet.transform,new Rect(68,370,464,130),new Color(.30f,.055f,.09f,.95f));
            Label("¡PREMIO!",view.winPanel.transform,new Rect(20,10,424,30),condensed,23,new Color(1,.85f,.50f),TextAnchor.MiddleCenter);
            view.winValue = Label("",view.winPanel.transform,new Rect(20,37,424,61),condensed,46,new Color(1,.94f,.73f),TextAnchor.MiddleCenter);
            Label("¡QUE SUENEN ESAS PESETAS!",view.winPanel.transform,new Rect(20,104,424,18),condensed,11,new Color(.88f,.75f,.51f),TextAnchor.MiddleCenter);
            view.winPanel.SetActive(false);
            controller.coins=cabinet.AddComponent<CoinShower>();controller.coins.pieces=new RawImage[18];
            for(int i=0;i<18;i++)
            {
                var coin=Raw("Prize coin "+i,cabinet.transform,new Rect(0,0,34,34),Load<Texture2D>("Art/coin-25.png"));
                coin.rectTransform.pivot=new Vector2(.5f,.5f);coin.gameObject.SetActive(false);controller.coins.pieces[i]=coin;
            }
            view.pausePanel = Panel("Pause",content.transform,new Rect(0,0,1440,1034),new Color(.02f,.035f,.025f,.92f));
            view.pausePanel.GetComponent<Image>().raycastTarget = true;
            view.pauseLabel = Label("UN MOMENTO…",view.pausePanel.transform,new Rect(470,390,500,110),italic,38,new Color(.95f,.91f,.76f),TextAnchor.MiddleCenter);
            view.resumeButton = TextButton("CONTINUAR",view.pausePanel.transform,new Rect(610,520,220,55),out _);
            view.pausePanel.SetActive(false);
            view.helpPanel = Panel("Help",content.transform,new Rect(0,0,1440,1034),new Color(.02f,.035f,.025f,.97f));
            view.helpPanel.GetComponent<Image>().raycastTarget = true;
            Label("La suerte tiene sus trucos.",view.helpPanel.transform,new Rect(400,255,680,72),italic,43,new Color(.95f,.91f,.76f));
            Label("M / botón oeste: mete 25 pesetas.\nESPACIO / botón sur: juega una moneda.\n\nTres iguales en la línea dan premio.\nDos cerezas en los dos primeros rodillos: 50 pesetas.\n\nA / S / D o izquierda / abajo / derecha en la cruceta:\nretén hasta dos rodillos o usa los avances gratis.\n\nC / botón norte: cobra premios y crédito sin jugar.\nP / Start: pausa.   V: sonido.\n\nH / hombro izquierdo o ESC: cerrar esta ayuda.\nESC fuera de la ayuda: terminar y devolver el saldo.",view.helpPanel.transform,new Rect(400,345,680,470),sans,17,new Color(.76f,.76f,.66f));
            var close = TextButton("ENTENDIDO · H",view.helpPanel.transform,new Rect(400,839,260,48),out _);
            // Persistent call is saved to the prefab; the remaining bindings are instance-local at runtime.
            UnityEditor.Events.UnityEventTools.AddPersistentListener(close.onClick,controller.ToggleHelp);
            view.helpPanel.SetActive(false);
            AssignAudio(sound);
            PrefabUtility.SaveAsPrefabAsset(root,folder+"/CostaVerde.prefab");
            var demo = new GameObject("Standalone sample host").AddComponent<CostaVerdeDemo>(); demo.machine = controller;
            var restart = TextButton("OTRA NOCHE",content.transform,new Rect(94,899,210,40),out _);
            restart.transform.SetSiblingIndex(5);
            UnityEditor.Events.UnityEventTools.AddPersistentListener(restart.onClick,demo.NewNight);
            EditorSceneManager.SaveScene(scene,folder+"/CostaVerde.unity"); AssetDatabase.SaveAssets();
            EditorSceneManager.CloseScene(scene,true);
            if(previousScene.IsValid() && previousScene.isLoaded)SceneManager.SetActiveScene(previousScene);
            Selection.activeObject=AssetDatabase.LoadAssetAtPath<SceneAsset>(folder+"/CostaVerde.unity");
            EditorGUIUtility.PingObject(Selection.activeObject);
            Debug.Log("Costa Verde: escena y prefab creados en "+folder+". Abre CostaVerde.unity sola y pulsa Play. El prefab espera Iniciar(contexto) del juego principal.");
        }

        private static void AssignAudio(MachineSound s)
        {
            s.coin=Load<AudioClip>("Audio/coin.wav");s.payoutCoin=Load<AudioClip>("Audio/payoutCoin.wav");s.click=Load<AudioClip>("Audio/click.wav");
            s.bonus=Load<AudioClip>("Audio/bonus.wav");s.anticipation=Load<AudioClip>("Audio/anticipation.wav");
            s.win=Load<AudioClip>("Audio/win.wav");s.jackpot=Load<AudioClip>("Audio/jackpot.wav");s.attract=Load<AudioClip>("Audio/attract.wav");s.motor=Load<AudioClip>("Audio/motor.wav");
            s.welcomeVoice=Load<AudioClip>("Audio/welcome-voice.wav");s.prizeVoice=Load<AudioClip>("Audio/prize-voice.wav");
            s.stops=new[]{Load<AudioClip>("Audio/stop0.wav"),Load<AudioClip>("Audio/stop1.wav"),Load<AudioClip>("Audio/stop2.wav")};
        }
        private static T Load<T>(string path) where T:UnityEngine.Object
        {
            var asset=AssetDatabase.LoadAssetAtPath<T>(Package+path);
            if (!asset) throw new FileNotFoundException("Recurso no importado: "+Package+path);
            return asset;
        }
        private static Rect Find(Layout layout,string name)
        {
            var b=Array.Find(layout.elements,e=>e.name==name);
            if(b==null)throw new InvalidOperationException("Falta "+name+" en el layout");
            return new Rect(b.x,b.y,b.width,b.height);
        }
        private static GameObject RectObject(string name,Transform parent,Rect box)
        {
            var go=new GameObject(name,typeof(RectTransform));go.transform.SetParent(parent,false);
            var r=(RectTransform)go.transform;r.anchorMin=r.anchorMax=r.pivot=new Vector2(0,1);
            r.anchoredPosition=new Vector2(box.x,-box.y);r.sizeDelta=new Vector2(box.width,box.height);return go;
        }
        private static void Stretch(RectTransform r)
        {r.anchorMin=Vector2.zero;r.anchorMax=Vector2.one;r.offsetMin=r.offsetMax=Vector2.zero;}
        private static RawImage Raw(string name,Transform parent,Rect box,Texture texture)
        {
            var image=RectObject(name,parent,box).AddComponent<RawImage>();image.texture=texture;image.raycastTarget=false;return image;
        }
        private static GameObject Panel(string name,Transform parent,Rect box,Color color)
        {
            var go=RectObject(name,parent,box);var image=go.AddComponent<Image>();image.color=color;image.raycastTarget=false;return go;
        }
        private static Text Label(string text,Transform parent,Rect box,Font font,int size,Color color,TextAnchor anchor=TextAnchor.UpperLeft)
        {
            var label=RectObject(text.Length>24?text.Substring(0,24):text,parent,box).AddComponent<Text>();
            label.font=font;label.fontSize=size;label.color=color;label.text=text;label.alignment=anchor;
            label.horizontalOverflow=HorizontalWrapMode.Wrap;label.verticalOverflow=VerticalWrapMode.Overflow;label.raycastTarget=false;return label;
        }
        private static Button ButtonArea(string name,Transform parent,Rect box)
        {
            var go=RectObject(name,parent,box);var image=go.AddComponent<Image>();image.color=Color.clear;
            var button=go.AddComponent<Button>();button.targetGraphic=image;return button;
        }
        private static Button TextButton(string text,Transform parent,Rect box,out Text label)
        {
            var button=ButtonArea(text,parent,box);button.GetComponent<Image>().color=new Color(.18f,.22f,.18f,.45f);
            label=Label(text,button.transform,new Rect(0,0,box.width,box.height),condensed,12,new Color(.82f,.79f,.66f),TextAnchor.MiddleCenter);
            return button;
        }
    }
}
