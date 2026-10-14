using UnityEngine;

namespace Cimavilla.Minigames.CostaVerde
{
    // Keeps the sample composition inside the available screen, including overscan/safe area.
    public sealed class FitReferenceCanvas : MonoBehaviour
    {
        public Vector2 reference = new Vector2(1440,1034);
        private void LateUpdate()
        {
            var rect = (RectTransform)transform;
            Rect safe = Screen.safeArea;
            float scale = Mathf.Min(safe.width/reference.x,safe.height/reference.y);
            rect.localScale = new Vector3(scale,scale,1);
            rect.anchoredPosition = safe.center-new Vector2(Screen.width*.5f,Screen.height*.5f);
        }
    }
}
