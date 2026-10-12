"use client";
import { useCallback } from "react";
import { useAvatarConversation } from "@/hooks/useAvatarConversation";
import { loadSavedState } from "@/avatar/state/avatarState";
import AvatarViewer from "./AvatarViewer";
import LocalConversationPanel from "./LocalConversationPanel";
import type { AvatarReady } from "./Avatar";

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
  return <AvatarViewer variant="connected" onModelReady={handleModelReady} playback={conversation.playback} sidebar={<LocalConversationPanel conversation={conversation} />} />;
}
