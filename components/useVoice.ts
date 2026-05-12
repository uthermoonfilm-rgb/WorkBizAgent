'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type VoiceState = 'idle' | 'listening' | 'speaking'

interface UseVoiceOptions {
  onTranscript?: (text: string) => void
  voice?: SpeechSynthesisVoice | null
}

export function useVoice({ onTranscript, voice }: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const hasSpeech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    const hasSynth = 'speechSynthesis' in window
    setIsSupported(hasSpeech && hasSynth)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => setState('listening')
    recognition.onend = () => setState('idle')
    recognition.onerror = () => setState('idle')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) {
        onTranscript?.(transcript)
      }
    }

    recognition.start()
  }, [isSupported, onTranscript])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    // Strip markdown for clean speech
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(clean)
    synthRef.current = utterance

    if (voice) utterance.voice = voice
    utterance.rate = 1.05
    utterance.pitch = 0.95
    utterance.volume = 1

    utterance.onstart = () => setState('speaking')
    utterance.onend = () => {
      setState('idle')
      onEnd?.()
    }
    utterance.onerror = () => setState('idle')

    window.speechSynthesis.speak(utterance)
  }, [voice])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setState('idle')
  }, [])

  const toggle = useCallback(() => {
    if (state === 'listening') {
      stopListening()
    } else if (state === 'idle') {
      startListening()
    } else if (state === 'speaking') {
      stopSpeaking()
    }
  }, [state, startListening, stopListening, stopSpeaking])

  return {
    state,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggle,
  }
}
