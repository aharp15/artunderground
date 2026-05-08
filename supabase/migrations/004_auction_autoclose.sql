-- ============================================================
-- 004_auction_autoclose.sql
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Function: close expired auctions, notify winner + seller
DROP FUNCTION IF EXISTS close_expired_auctions();
CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _auction RECORD;
  _winning RECORD;
  _closed  integer := 0;
BEGIN
  FOR _auction IN
    SELECT id, seller_id
    FROM auctions
    WHERE status = 'live' AND closes_at <= now()
  LOOP
    UPDATE auctions SET status = 'ended' WHERE id = _auction.id;
    _closed := _closed + 1;

    SELECT bidder_id, amount_gbp INTO _winning
    FROM bids
    WHERE auction_id = _auction.id AND is_winning = true
    LIMIT 1;

    IF _winning.bidder_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, payload) VALUES (
        _winning.bidder_id, 'auction_won',
        jsonb_build_object('auction_id', _auction.id, 'amount_gbp', _winning.amount_gbp)
      );
      INSERT INTO notifications (user_id, type, payload) VALUES (
        _auction.seller_id, 'auction_ended_sold',
        jsonb_build_object('auction_id', _auction.id, 'winning_bid', _winning.amount_gbp, 'winner_id', _winning.bidder_id)
      );
    ELSE
      INSERT INTO notifications (user_id, type, payload) VALUES (
        _auction.seller_id, 'auction_ended_unsold',
        jsonb_build_object('auction_id', _auction.id)
      );
    END IF;
  END LOOP;

  RETURN _closed;
END;
$$;

-- ── pg_cron schedule ────────────────────────────────────────
-- Requires pg_cron extension. Enable it first:
--   Dashboard → Database → Extensions → search "pg_cron" → Enable
--
-- Then run:
-- SELECT cron.schedule('close-expired-auctions', '* * * * *', 'SELECT close_expired_auctions()');
--
-- To remove the job later:
-- SELECT cron.unschedule('close-expired-auctions');
