"use client";
import { useCallback, type ReactNode } from "react";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { loadSavedState } from "@/avatar/state/avatarState";
import AvatarViewer from "./AvatarViewer";
import LocalConversationPanel from "./LocalConversationPanel";
import type { AvatarReady } from "./Avatar";

function ConnectedSidebar({ conversation, cameraControls }: { conversation: Conversation; cameraControls?: ReactNode }) {
  return <div className="connected-sidebar-content"><div className="connected-sidebar-title"><p className="eyebrow">Local AI · Qwen3 14B</p><h2>Conversation</h2>{cameraControls && <div className="connected-camera-controls">{cameraControls}</div>}</div><LocalConversationPanel conversation={conversation} /></div>;
}

/** The conversation page: shows the avatar exactly as saved in the Studio, with the local AI connection in the sidebar. */
export default function ConnectedAvatar() {
  const conversation = useAvatarConversation();
  const { onModelReady, setBaselineEmotion } = conversation;
  // Must stay referentially stable: the avatar rebuilds its engine whenever this callback changes.
  const handleModelReady = useCallback((model: AvatarReady | null) => {
    onModelReady(model);
    const saved = model ? loadSavedState() : null;
    // The saved expression is what the avatar returns to between and after conversations.
    if (saved) setBaselineEmotion(saved.face.emotion, saved.face.intensity);
  }, [onModelReady, setBaselineEmotion]);
  return <AvatarViewer variant="connected" onModelReady={handleModelReady} playback={conversation.playback} sidebar={<ConnectedSidebar conversation={conversation} />} />;
}
