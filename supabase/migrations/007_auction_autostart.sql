-- ============================================================
-- 007_auction_autostart.sql
-- Updates close_expired_auctions() to also open scheduled auctions
-- Run in Supabase SQL Editor
-- ============================================================

DROP FUNCTION IF EXISTS close_expired_auctions();

CREATE OR REPLACE FUNCTION close_expired_auctions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _auction RECORD;
  _winning RECORD;
  _closed  integer := 0;
  _opened  integer := 0;
BEGIN
  -- Open scheduled auctions whose opens_at has passed
  UPDATE auctions
  SET    status = 'live'
  WHERE  status = 'scheduled' AND opens_at <= now();
  GET DIAGNOSTICS _opened = ROW_COUNT;

  -- Close live auctions whose closes_at has passed
  FOR _auction IN
    SELECT id, seller_id
    FROM   auctions
    WHERE  status = 'live' AND closes_at <= now()
  LOOP
    UPDATE auctions SET status = 'ended' WHERE id = _auction.id;
    _closed := _closed + 1;

    SELECT bidder_id, amount_gbp INTO _winning
    FROM   bids
    WHERE  auction_id = _auction.id AND is_winning = true
    LIMIT  1;

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

  RETURN jsonb_build_object('opened', _opened, 'closed', _closed);
END;
$$;

-- Update pg_cron job if it exists (safe to run even if pg_cron isn't enabled)
-- SELECT cron.unschedule('close-expired-auctions');
-- SELECT cron.schedule('close-expired-auctions', '* * * * *', 'SELECT close_expired_auctions()');
