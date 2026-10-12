"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { initialActionState } from "@/features/auth/action-state";
import { updateProfileAction } from "../actions";

export function ProfileForm({ profile }: {
  profile: { handle: string; displayName: string; bio: string; completed: boolean };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, initialActionState);
  const [handle, setHandle] = useState(profile.completed ? profile.handle : "");
  const [displayName, setDisplayName] = useState(profile.completed ? profile.displayName : "");
  const [bio, setBio] = useState(profile.bio);
  const handleLocked = profile.completed || state.status === "success";
  return <form className="auth-form" action={action} aria-busy={pending}>
    <fieldset disabled={pending}>
      <legend className="sr-only">프로필 설정</legend>
      <TextField id="profile-display-name" name="displayName" label="닉네임" autoComplete="nickname" required
        minLength={2} maxLength={30} value={displayName} onChange={(event) => setDisplayName(event.target.value)}
        error={state.fieldErrors?.displayName} hint="요리 이야기를 나눌 때 표시되는 이름이에요. 2~30자." />
      <TextField id="profile-handle" name="handle" label="프로필 주소" autoComplete="off" required
        minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" readOnly={handleLocked}
        value={handle} onChange={(event) => setHandle(event.target.value)} error={state.fieldErrors?.handle}
        hint={handleLocked ? "프로필 주소는 처음 설정한 뒤 변경할 수 없어요." : "영문 소문자, 숫자, 밑줄 3~24자. 저장 후 변경할 수 없어요."} />
      <div className="field">
        <label htmlFor="profile-bio">짧은 소개</label>
        <textarea id="profile-bio" name="bio" rows={4} maxLength={300} value={bio}
          onChange={(event) => setBio(event.target.value)} aria-invalid={Boolean(state.fieldErrors?.bio)}
          aria-describedby={`profile-bio-hint${state.fieldErrors?.bio ? " profile-bio-error" : ""}`} />
        <p className="field-hint" id="profile-bio-hint">좋아하는 요리나 나누고 싶은 이야기를 적어 주세요. 최대 300자.</p>
        {state.fieldErrors?.bio ? <p className="field-error" id="profile-bio-error">{state.fieldErrors.bio}</p> : null}
      </div>
      <p className="field-hint">닉네임, 프로필 주소, 소개는 공개돼요. 이메일은 공개되지 않아요.</p>
      <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "프로필 저장"}</Button>
    </fieldset>
    {state.message ? <p className={state.status === "error" ? "field-error" : "auth-message"}
      role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    {state.status === "success" ? <Link className="text-link" href="/me">내 공간으로 이동</Link> : null}
  </form>;
}
