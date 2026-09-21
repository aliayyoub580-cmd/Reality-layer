export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          emailVerified: string | null;
          password: string | null;
          image: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email: string;
          emailVerified?: string | null;
          password?: string | null;
          image?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          emailVerified?: string | null;
          password?: string | null;
          image?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      Project: {
        Row: {
          id: string;
          userId: string;
          name: string;
          domain: string;
          url: string;
          crawlLimit: number;
          status: string;
          healthScore: number | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          name: string;
          domain: string;
          url: string;
          crawlLimit?: number;
          status?: string;
          healthScore?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          name?: string;
          domain?: string;
          url?: string;
          crawlLimit?: number;
          status?: string;
          healthScore?: number | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      Crawl: {
        Row: {
          id: string;
          projectId: string;
          status: string;
          pagesDiscovered: number;
          pagesAnalyzed: number;
          totalPages: number;
          healthScore: number | null;
          errorMessage: string | null;
          startedAt: string | null;
          completedAt: string | null;
          createdAt: string;
        };
        Insert: {
          id?: string;
          projectId: string;
          status?: string;
          pagesDiscovered?: number;
          pagesAnalyzed?: number;
          totalPages?: number;
          healthScore?: number | null;
          errorMessage?: string | null;
          startedAt?: string | null;
          completedAt?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          projectId?: string;
          status?: string;
          pagesDiscovered?: number;
          pagesAnalyzed?: number;
          totalPages?: number;
          healthScore?: number | null;
          errorMessage?: string | null;
          startedAt?: string | null;
          completedAt?: string | null;
          createdAt?: string;
        };
        Relationships: [];
      };
      news: {
        Row: {
          id: string;
          external_id: string;
          title: string;
          summary: string | null;
          image_url: string | null;
          article_url: string;
          news_site: string | null;
          published_at: string | null;
          fetched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          external_id: string;
          title: string;
          summary?: string | null;
          image_url?: string | null;
          article_url: string;
          news_site?: string | null;
          published_at?: string | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          external_id?: string;
          title?: string;
          summary?: string | null;
          image_url?: string | null;
          article_url?: string;
          news_site?: string | null;
          published_at?: string | null;
          fetched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      replace_news: {
        Args: {
          p_articles: Record<string, unknown>[];
        };
        Returns: number;
      };
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
