import type { VoteCount } from "./aggregate";
import type { Tier } from "./tiers";
import type { VoteInput } from "./validate";

export type TopicStatus = "active" | "hidden";

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: TopicStatus;
  created_by: string | null;
  created_at: string;
}

export interface TopicSummary extends Topic {
  participants: number;
  item_count: number;
  /** 미리보기 (주제에 추가된 순서로 최대 4개) */
  preview: Thumb[];
}

/** anilist·upload는 이미지, text는 이모지나 이름 글자로 보여준다 */
export type CharacterSource = "anilist" | "upload" | "text";

export interface Character {
  id: string;
  name: string;
  series: string;
  /** text 항목은 빈 문자열 */
  image_url: string;
  /** 이미지 대신 보여줄 이모지 (없으면 이름 글자) */
  emoji?: string | null;
  source: CharacterSource;
  anilist_id: number | null;
  source_url: string | null;
}

export type NewCharacter = Omit<Character, "id">;

/** 썸네일을 그리는 데 필요한 값 */
export type Thumb = Pick<Character, "name" | "image_url" | "emoji">;

export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Report {
  id: string;
  target_type: "topic" | "item";
  topic_id: string;
  character_id: string | null;
  reason: string;
  user_id: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface ReportView extends Report {
  topic_title: string;
  topic_slug: string;
  character_name: string | null;
}

export interface Store {
  ensureUser(id: string, provider: string, label: string): Promise<void>;

  listTopics(opts: { includeHidden: boolean }): Promise<TopicSummary[]>;
  getTopic(id: string): Promise<Topic | null>;
  getTopicBySlug(slug: string): Promise<Topic | null>;
  /** slug가 이미 있으면 null */
  createTopic(t: Pick<Topic, "slug" | "title" | "description" | "category" | "created_by">): Promise<Topic | null>;
  setTopicStatus(id: string, status: TopicStatus): Promise<void>;
  updateTopic(id: string, fields: Pick<Topic, "title" | "description" | "category">): Promise<void>;

  /** 주제에 속한 캐릭터 (추가된 순서) */
  listItems(topicId: string): Promise<Character[]>;
  /** 캐릭터를 만들거나(AniList id가 같으면 재사용) 주제에 추가한다. 이미 있는 항목은 건너뛴다. */
  addItems(topicId: string, chars: NewCharacter[]): Promise<number>;
  removeItem(topicId: string, characterId: string): Promise<void>;
  renameCharacter(characterId: string, name: string): Promise<void>;

  getUserVotes(topicId: string, userId: string): Promise<Record<string, Tier>>;
  /** 이 사용자의 이 주제 표를 통째로 교체한다 (트랜잭션) */
  replaceVotes(topicId: string, userId: string, votes: VoteInput[]): Promise<void>;
  voteCounts(topicId: string): Promise<VoteCount[]>;
  participantCount(topicId: string): Promise<number>;

  createReport(r: Pick<Report, "target_type" | "topic_id" | "character_id" | "reason" | "user_id">): Promise<void>;
  listReports(status: ReportStatus): Promise<ReportView[]>;
  getReport(id: string): Promise<Report | null>;
  setReportStatus(id: string, status: ReportStatus): Promise<void>;

  /** 업로드 이미지를 저장하고 공개 URL을 돌려준다 */
  saveImage(data: Buffer, ext: string): Promise<string>;
}
