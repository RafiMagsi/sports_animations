Drop your background video here as: background.mp4

That's it — no code changes needed. The site's <video> tag already
points to assets/video/background.mp4 as its first source; the moment
a real file exists at this path, the browser uses it automatically
instead of falling through to the temporary hotlinked placeholder clip.

Recommended specs for best results:
- Landscape orientation (site is a full-viewport background)
- H.264 MP4, 1920x1080 or higher
- Keep file size reasonable (a few tens of MB) since it's seeked
  frequently while scrolling, not played straight through
