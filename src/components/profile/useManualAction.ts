"use client";

import { startTransition, useActionState, type FormEvent } from "react";

// Envoi d'un formulaire à une action serveur sans la remise à zéro
// automatique de React 19 : les champs gardent leur saisie, même en cas
// d'erreur. Le bouton cliqué (name="intent") est transmis avec les données.
export function useManualAction<S>(
  action: (state: Awaited<S>, formData: FormData) => S | Promise<S>,
  initialState: Awaited<S>,
) {
  const [state, dispatch, pending] = useActionState(action, initialState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = submitter
      ? new FormData(event.currentTarget, submitter)
      : new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }

  return { state, pending, onSubmit };
}
