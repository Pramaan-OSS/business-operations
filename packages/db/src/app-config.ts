export type UnknownAppConfig = Record<string, unknown>;

export type SlackAppConfig = {
  access_token: string;
  team_id: string;
  team_name: string;
  channel: string;
  channel_id: string;
  slack_configuration_url: string;
  url: string;
  bot_user_id: string;
};

export type WhatsAppConnection = {
  phoneNumber: string;
  displayName?: string;
  connectedAt: string;
};

export type WhatsAppAppConfig = {
  connections?: WhatsAppConnection[];
};

export type TelegramConnection = {
  userId: string;
  chatId: string;
  username?: string;
  displayName?: string;
  connectedAt: string;
};

export type TelegramAppConfig = {
  connections?: TelegramConnection[];
};

export type AppConfigById = {
  slack: SlackAppConfig;
  telegram: TelegramAppConfig;
  whatsapp: WhatsAppAppConfig;
};

export type KnownAppId = keyof AppConfigById;

export type AppConfigFor<TAppId extends string> = TAppId extends KnownAppId
  ? AppConfigById[TAppId]
  : UnknownAppConfig;

export type AnyTypedAppConfig = AppConfigById[KnownAppId];
export type AnyAppConfig = AnyTypedAppConfig | UnknownAppConfig;
