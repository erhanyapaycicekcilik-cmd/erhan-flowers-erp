'use client'

import { useEffect, useRef } from 'react'

interface Props {
  videoUrl: string
  title?: string
  autoplay?: boolean
}

function getEmbedUrl(url: string): { type: 'youtube' | 'tiktok' | 'direct'; src: string } | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&rel=0&playsinline=1` }

  // TikTok
  const tt = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (tt) return { type: 'tiktok', src: `https://www.tiktok.com/embed/v2/${tt[1]}` }

  // Direkt video (mp4 vb.)
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { type: 'direct', src: url }

  return null
}

export function ProductVideo({ videoUrl, title, autoplay = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const embed = getEmbedUrl(videoUrl)
  if (!embed) return null

  if (embed.type === 'direct') {
    return (
      <div className="rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={embed.src}
          controls
          playsInline
          muted={autoplay}
          autoPlay={autoplay}
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-black aspect-video">
      <iframe
        src={embed.src}
        title={title || 'Ürün videosu'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  )
}
