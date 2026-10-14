using UnityEngine;
using UnityEngine.UI;

namespace Cimavilla.Minigames.CostaVerde
{
    // A small reusable UI pool; its motion never consumes the outcome RNG.
    public sealed class CoinShower : MonoBehaviour
    {
        public RawImage[] pieces;
        private float elapsed,duration;
        private bool winning;
        public void Begin(float seconds,bool prize)
        { Clear(); duration=seconds; winning=prize; }
        public void Tick(float delta)
        {
            if(duration<=0)return;
            elapsed+=delta;
            if(elapsed>=duration){Clear();return;}
            for(int i=0;i<pieces.Length;i++)
            {
                float age=elapsed-i*.065f;
                bool visible=age>=0 && age<1.6f; pieces[i].gameObject.SetActive(visible);
                if(!visible)continue;
                var r=pieces[i].rectTransform;
                float x=winning?50+(i*97)%480:250+(i*29)%140;
                float y=winning?300+age*105+age*age*210:715+Mathf.Abs(Mathf.Sin(age*4))*22;
                r.anchoredPosition=new Vector2(x,-y);
                r.localEulerAngles=new Vector3(0,0,i*37+age*95);
                r.localScale=new Vector3(.45f+.55f*Mathf.Abs(Mathf.Cos(age*5+i)),1,1);
                var c=Color.white;c.a=Mathf.Clamp01((1.6f-age)*1.5f);pieces[i].color=c;
            }
        }
        public void Clear()
        {
            duration=elapsed=0;
            if(pieces!=null)foreach(var piece in pieces)if(piece)piece.gameObject.SetActive(false);
        }
    }
}
