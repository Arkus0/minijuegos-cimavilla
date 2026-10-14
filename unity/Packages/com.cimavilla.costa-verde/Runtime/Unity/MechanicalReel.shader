Shader "Cimavilla/Mechanical Reel UI"
{
    Properties
    {
        [PerRendererData] _MainTex ("Five-symbol atlas", 2D) = "white" {}
        _Color ("Tint", Color) = (1,1,1,1)
        _Stop ("Physical stop", Float) = 0
        _Aspect ("Window width / height", Float) = 1
        _StencilComp ("Stencil Comparison", Float) = 8
        _Stencil ("Stencil ID", Float) = 0
        _StencilOp ("Stencil Operation", Float) = 0
        _StencilWriteMask ("Stencil Write Mask", Float) = 255
        _StencilReadMask ("Stencil Read Mask", Float) = 255
        _ColorMask ("Color Mask", Float) = 15
        [Toggle(UNITY_UI_ALPHACLIP)] _UseUIAlphaClip ("Use Alpha Clip", Float) = 0
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "IgnoreProjector"="True" "RenderType"="Transparent" "PreviewType"="Plane" "CanUseSpriteAtlas"="False" }
        Stencil { Ref [_Stencil] Comp [_StencilComp] Pass [_StencilOp] ReadMask [_StencilReadMask] WriteMask [_StencilWriteMask] }
        Cull Off Lighting Off ZWrite Off ZTest [unity_GUIZTestMode]
        Blend SrcAlpha OneMinusSrcAlpha
        ColorMask [_ColorMask]
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma target 3.0
            #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
            #pragma multi_compile_local _ UNITY_UI_ALPHACLIP
            #include "UnityCG.cginc"
            #include "UnityUI.cginc"
            struct appdata { float4 vertex:POSITION; float4 color:COLOR; float2 uv:TEXCOORD0; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct v2f { float4 vertex:SV_POSITION; fixed4 color:COLOR; float2 uv:TEXCOORD0; float4 world:TEXCOORD1; UNITY_VERTEX_OUTPUT_STEREO };
            sampler2D _MainTex;
            fixed4 _Color;
            float4 _ClipRect;
            float _Stop, _Aspect;
            float _Symbols[21];
            v2f vert(appdata v)
            {
                v2f o; UNITY_SETUP_INSTANCE_ID(v); UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
                o.world=v.vertex; o.vertex=UnityObjectToClipPos(v.vertex); o.uv=v.uv; o.color=v.color*_Color;
                return o;
            }
            fixed4 frag(v2f i):SV_Target
            {
                // Printed icons follow the same sine projection as the approved web reels.
                float x=i.uv.x;
                float3 paper=lerp(float3(.77,.75,.67),float3(.93,.91,.83),saturate(x/.18));
                paper=lerp(paper,float3(1,.984,.933),saturate((x-.18)/.38));
                paper=lerp(paper,float3(.91,.88,.784),saturate((x-.56)/.34));
                paper=lerp(paper,float3(.667,.639,.553),saturate((x-.9)/.1));
                #ifndef UNITY_COLORSPACE_GAMMA
                paper=GammaToLinearSpace(paper);
                #endif
                float sizeY=min(_Aspect*.83,.72), sizeX=sizeY/_Aspect;
                [unroll] for(int offset=-2;offset<=2;offset++)
                {
                    float stop=floor(_Stop+.5)+offset,angle=(stop-_Stop)*1.05;
                    float center=.5+sin(angle)*.60, height=sizeY*max(.07,cos(angle));
                    float2 uv=float2((x-.5)/sizeX+.5,(i.uv.y-center)/height+.5);
                    if(abs(angle)<=1.68 && all(uv>=0) && all(uv<=1))
                    {
                        int index=(int)(stop-floor(stop/21)*21);
                        // Inset prevents filtering into the adjacent row at the cell edge.
                        float atlasY=(_Symbols[index]+clamp(uv.y,.002,.998))/5;
                        fixed4 icon=tex2D(_MainTex,float2(uv.x,atlasY));
                        paper=lerp(paper,icon.rgb,icon.a*saturate(max(.3,cos(angle)+.28)));
                    }
                }
                float edge=pow(abs(i.uv.y-.5)*2,3);
                paper*=1-edge*.74;
                float reflection=step(.12+i.uv.y*.35,x)*step(x,.29+i.uv.y*.25)*.10;
                paper=lerp(paper,float3(1,1,.96),reflection);
                fixed4 color=fixed4(paper,1)*i.color;
                #ifdef UNITY_UI_CLIP_RECT
                color.a*=UnityGet2DClipping(i.world.xy,_ClipRect);
                #endif
                #ifdef UNITY_UI_ALPHACLIP
                clip(color.a-.001);
                #endif
                return color;
            }
            ENDCG
        }
    }
}
