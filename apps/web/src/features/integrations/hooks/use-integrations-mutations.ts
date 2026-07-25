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
        const dto = input as IntegrationDto & ConnectIntegrationInput;
        return integrationsService.connect({
          slug: dto.slug as ConnectIntegrationInput["slug"],
          integrationId: "id" in dto ? dto.id : dto.integrationId,
          secret: dto.secret,
          label: dto.label,
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
        const dto = input as IntegrationDto & DisconnectIntegrationInput;
        return integrationsService.disconnect({
          slug: dto.slug as DisconnectIntegrationInput["slug"],
          integrationId: "id" in dto ? dto.id : dto.integrationId,
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
        const dto = input as IntegrationDto & TestIntegrationInput;
        return integrationsService.test({
          slug: dto.slug as TestIntegrationInput["slug"],
          integrationId: "id" in dto ? dto.id : dto.integrationId,
        });
      }
      return integrationsService.test(input as TestIntegrationInput);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: integrationsKeys.all });
    },
  });
}
