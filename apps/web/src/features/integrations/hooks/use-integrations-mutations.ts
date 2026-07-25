"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  ConnectIntegrationInput,
  DisconnectIntegrationInput,
  IntegrationDto,
  TestIntegrationInput,
} from "@enterprise/shared";

import {
  integrationsService,
  resolveApiKeyProvider,
  resolveOAuthProvider,
} from "../services/integrations.service";
import { integrationsKeys } from "./use-integrations";

function resolveIntegrationId(
  input: ConnectIntegrationInput | DisconnectIntegrationInput | TestIntegrationInput | IntegrationDto,
): string | undefined {
  if ("id" in input && typeof input.id === "string") {
    return input.id;
  }
  if ("integrationId" in input && typeof input.integrationId === "string") {
    return input.integrationId;
  }
  return undefined;
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ConnectIntegrationInput | IntegrationDto,
    ) => {
      if ("slug" in input && input.slug) {
        const oauth = resolveOAuthProvider(input.slug);
        if (oauth) {
          return integrationsService.connectProvider(oauth);
        }
        const apiKey = resolveApiKeyProvider(input.slug);
        if (apiKey) {
          const body = input as ConnectIntegrationInput;
          return integrationsService.connectApiKeyProvider(apiKey, {
            secret: body.secret,
            label: body.label,
          });
        }
        // Generic connect — send only schema fields (never the full DTO).
        const body = input as ConnectIntegrationInput;
        return integrationsService.connect({
          slug: input.slug as ConnectIntegrationInput["slug"],
          integrationId: resolveIntegrationId(input),
          secret: body.secret,
          label: body.label,
        });
      }
      const body = input as ConnectIntegrationInput;
      return integrationsService.connect(body);
    },
    onSuccess: (result) => {
      if (result.authorizeUrl) {
        window.location.assign(result.authorizeUrl);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DisconnectIntegrationInput | IntegrationDto) => {
      if ("slug" in input && input.slug) {
        const oauth = resolveOAuthProvider(input.slug);
        if (oauth) {
          return integrationsService.disconnectProvider(oauth);
        }
        const apiKey = resolveApiKeyProvider(input.slug);
        if (apiKey) {
          return integrationsService.disconnectApiKeyProvider(apiKey);
        }
        return integrationsService.disconnect({
          slug: input.slug as DisconnectIntegrationInput["slug"],
          integrationId: resolveIntegrationId(input),
        });
      }
      return integrationsService.disconnect(input as DisconnectIntegrationInput);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TestIntegrationInput | IntegrationDto) => {
      if ("slug" in input && input.slug) {
        const oauth = resolveOAuthProvider(input.slug);
        if (oauth) {
          return integrationsService.testProvider(oauth);
        }
        const apiKey = resolveApiKeyProvider(input.slug);
        if (apiKey) {
          return integrationsService.testApiKeyProvider(apiKey);
        }
        return integrationsService.test({
          slug: input.slug as TestIntegrationInput["slug"],
          integrationId: resolveIntegrationId(input),
        });
      }
      return integrationsService.test(input as TestIntegrationInput);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}
