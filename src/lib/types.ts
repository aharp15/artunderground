export type Role = 'artist' | 'collector' | 'curator'
export type ArtworkStatus = 'draft' | 'listed' | 'in_auction' | 'sold' | 'unlisted'
export type AuctionStatus = 'scheduled' | 'live' | 'ended' | 'settled' | 'cancelled'
export type TransactionStatus = 'pending' | 'completed' | 'refunded' | 'disputed'

export interface Profile {
  id: string; auth_user_id: string; display_name: string
  roles: Role[]; bio: string | null; location: string | null
  avatar_url: string | null; stripe_account_id: string | null; created_at: string
}

export interface ProvenanceEvent {
  type: 'created' | 'exhibited' | 'listed' | 'sold' | 'transferred'
  description: string; date: string; location?: string
}

export interface Artwork {
  id: string; artist_id: string; title: string; medium: string | null
  dimensions: string | null; year: number | null; status: ArtworkStatus
  price_gbp: number | null; image_urls: string[]; certificate_url: string | null
  provenance: ProvenanceEvent[]; created_at: string
}

export interface Auction {
  id: string; artwork_id: string; seller_id: string; reserve_gbp: number
  current_bid_gbp: number | null; current_bidder_id: string | null; bid_count: number
  opens_at: string; closes_at: string; status: AuctionStatus; buyer_premium_pct: number | null
  visibility: 'public' | 'private'
}

export interface Bid {
  id: string; auction_id: string; bidder_id: string
  amount_gbp: number; placed_at: string; is_winning: boolean
}

export interface Transaction {
  id: string; artwork_id: string; buyer_id: string; seller_id: string
  auction_id: string | null; sale_price_gbp: number; commission_gbp: number
  buyer_premium_gbp: number; stripe_payment_id: string | null
  status: TransactionStatus; completed_at: string | null
}

export interface Exhibition {
  id: string; curator_id: string; title: string; statement: string | null
  status: 'draft' | 'published' | 'closed'
  visibility: 'public' | 'link_only' | 'invite_only'
  opens_at: string | null; closes_at: string | null
  auction_enabled: boolean; created_at: string
}

export interface Notification {
  id: string; user_id: string
  type: 'new_bid' | 'outbid' | 'auction_won' | 'auction_ended_sold' |
        'auction_ended_unsold' | 'new_follower' | 'work_featured' |
        'new_message' | 'auction_invite'
  payload: Record<string, unknown>; read: boolean; created_at: string
}

export interface Conversation {
  id: string
  participant_a: string
  participant_b: string
  artwork_id: string | null
  last_message_at: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export interface AuctionInvite {
  id: string
  auction_id: string
  invitee_id: string
  invited_by: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles:         { Row: Profile }
      artworks:         { Row: Artwork }
      auctions:         { Row: Auction }
      bids:             { Row: Bid }
      transactions:     { Row: Transaction }
      exhibitions:      { Row: Exhibition }
      notifications:    { Row: Notification }
      conversations:    { Row: Conversation }
      messages:         { Row: Message }
      auction_invites:  { Row: AuctionInvite }
    }
    Functions: {
      place_bid: {
        Args: { p_auction_id: string; p_amount_gbp: number }
        Returns: { ok: boolean; bid_id?: string; amount?: number; error?: string; minimum_bid?: number }
      }
      get_or_create_conversation: {
        Args: { p_other_profile_id: string; p_artwork_id?: string | null }
        Returns: string
      }
    }
  }
}
