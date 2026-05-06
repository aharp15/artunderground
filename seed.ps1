# ArtUNDERGROUND - Seed data Part 2 (profiles, artworks, auctions)
# Run AFTER artunderground_seed_users.sql in Supabase SQL Editor

$ErrorActionPreference = "Stop"

function log($msg) { Write-Host ">> $msg" -ForegroundColor Green }

# Load env vars
Get-Content ".env.local" | ForEach-Object {
  if ($_ -match "^([^#][^=]+)=(.+)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}
$URL = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL")
$KEY = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")
$H = @{ "apikey"=$KEY; "Authorization"="Bearer $KEY"; "Content-Type"="application/json"; "Prefer"="return=representation" }
$HP = @{ "apikey"=$KEY; "Authorization"="Bearer $KEY"; "Content-Type"="application/json"; "Prefer"="return=minimal" }

function Post($table, $data) {
  $r = Invoke-RestMethod -Uri "$URL/rest/v1/$table" -Method Post -Headers $H -Body ($data | ConvertTo-Json -Compress -Depth 10)
  return $r
}
function Patch($table, $id, $data) {
  Invoke-RestMethod -Uri "$URL/rest/v1/$table?id=eq.$id" -Method Patch -Headers $HP -Body ($data | ConvertTo-Json -Compress) | Out-Null
}

Write-Host ""
Write-Host "ArtUNDERGROUND - Seeding profiles, artworks, auctions" -ForegroundColor Magenta
Write-Host ""

# User IDs created by SQL script
$uid_yara = "aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa"
$uid_kwame = "aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa"
$uid_amara = "aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa"
$uid_collector = "aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa"
$uid_curator = "aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa"

# -- Profiles ----------------------------------------------
$pids = @{}

log "Profile: Yara Mohammed"
try {
  $p = Post "profiles" @{ auth_user_id=$uid_yara; display_name="Yara Mohammed"; roles=@("artist"); bio="Painter exploring memory, light and diaspora through oil and watercolour."; location="London, UK" }
  $pids["yara"] = $p.id; log "  $($p.id)"
} catch { Write-Host "  Skip (exists?): $_" -ForegroundColor Yellow }
if (!$pids["yara"]) {
  $ex = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?auth_user_id=eq.$uid_yara" -Method Get -Headers $H
  if ($ex) { $pids["yara"] = $ex[0].id; log "  Found: $($ex[0].id)" }
}

log "Profile: Kwame Boateng"
try {
  $p = Post "profiles" @{ auth_user_id=$uid_kwame; display_name="Kwame Boateng"; roles=@("artist"); bio="Sculptor and photographer working with found objects and urban landscapes."; location="Accra / London" }
  $pids["kwame"] = $p.id; log "  $($p.id)"
} catch { Write-Host "  Skip (exists?): $_" -ForegroundColor Yellow }
if (!$pids["kwame"]) {
  $ex = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?auth_user_id=eq.$uid_kwame" -Method Get -Headers $H
  if ($ex) { $pids["kwame"] = $ex[0].id; log "  Found: $($ex[0].id)" }
}

log "Profile: Amara Diallo"
try {
  $p = Post "profiles" @{ auth_user_id=$uid_amara; display_name="Amara Diallo"; roles=@("artist"); bio="Ceramic artist drawing on West African vessel traditions and contemporary form."; location="Paris / Lagos" }
  $pids["amara"] = $p.id; log "  $($p.id)"
} catch { Write-Host "  Skip (exists?): $_" -ForegroundColor Yellow }
if (!$pids["amara"]) {
  $ex = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?auth_user_id=eq.$uid_amara" -Method Get -Headers $H
  if ($ex) { $pids["amara"] = $ex[0].id; log "  Found: $($ex[0].id)" }
}

log "Profile: Alex Rivera"
try {
  $p = Post "profiles" @{ auth_user_id=$uid_collector; display_name="Alex Rivera"; roles=@("collector"); bio="Contemporary art collector focused on emerging African and diaspora artists."; location="New York, USA" }
  $pids["collector"] = $p.id; log "  $($p.id)"
} catch { Write-Host "  Skip (exists?): $_" -ForegroundColor Yellow }
if (!$pids["collector"]) {
  $ex = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?auth_user_id=eq.$uid_collector" -Method Get -Headers $H
  if ($ex) { $pids["collector"] = $ex[0].id; log "  Found: $($ex[0].id)" }
}

log "Profile: The Whitechapel Collective"
try {
  $p = Post "profiles" @{ auth_user_id=$uid_curator; display_name="The Whitechapel Collective"; roles=@("curator"); bio="East London curator collective focused on diaspora and identity in contemporary art."; location="London, UK" }
  $pids["curator"] = $p.id; log "  $($p.id)"
} catch { Write-Host "  Skip (exists?): $_" -ForegroundColor Yellow }
if (!$pids["curator"]) {
  $ex = Invoke-RestMethod -Uri "$URL/rest/v1/profiles?auth_user_id=eq.$uid_curator" -Method Get -Headers $H
  if ($ex) { $pids["curator"] = $ex[0].id; log "  Found: $($ex[0].id)" }
}

# -- Artworks ----------------------------------------------
$awids = @{}

log "Artwork: Echoes of Islington"
if ($pids["yara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["yara"]; title="Echoes of Islington"; medium="Oil on canvas"
      dimensions="80 x 100 cm"; year=2024; price_gbp=4200
      status="in_auction"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2024-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2024-10-01""}]"
    }
    $awids["a0"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Tidal no. 7"
if ($pids["yara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["yara"]; title="Tidal no. 7"; medium="Mixed media"
      dimensions="60 x 80 cm"; year=2024; price_gbp=1850
      status="listed"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2024-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2024-10-01""}]"
    }
    $awids["a1"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Garden Memory"
if ($pids["yara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["yara"]; title="Garden Memory"; medium="Watercolour"
      dimensions="42 x 59 cm"; year=2023; price_gbp=950
      status="listed"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2023-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2023-10-01""}]"
    }
    $awids["a2"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Self III"
if ($pids["yara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["yara"]; title="Self III"; medium="Charcoal"
      dimensions="30 x 40 cm"; year=2023; price_gbp=730
      status="in_auction"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2023-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2023-10-01""}]"
    }
    $awids["a3"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Ancestor Study"
if ($pids["kwame"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["kwame"]; title="Ancestor Study"; medium="Ceramic"
      dimensions="25 cm height"; year=2023; price_gbp=3500
      status="listed"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2023-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2023-10-01""}]"
    }
    $awids["a4"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Coastline no. 4"
if ($pids["kwame"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["kwame"]; title="Coastline no. 4"; medium="Photography"
      dimensions="50 x 70 cm"; year=2024; price_gbp=2100
      status="listed"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2024-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2024-10-01""}]"
    }
    $awids["a5"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: Vessel Study II"
if ($pids["amara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["amara"]; title="Vessel Study II"; medium="Ceramic"
      dimensions="30 cm height"; year=2023; price_gbp=1200
      status="in_auction"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2023-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2023-10-01""}]"
    }
    $awids["a6"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

log "Artwork: After Rain"
if ($pids["amara"]) {
  try {
    $aw = Post "artworks" @{
      artist_id=$pids["amara"]; title="After Rain"; medium="Oil on linen"
      dimensions="60 x 80 cm"; year=2024; price_gbp=870
      status="listed"; image_urls=@()
      provenance="[{""type"":""created"",""description"":""Work created by artist"",""date"":""2024-03-01""},{""type"":""listed"",""description"":""Listed on ArtUNDERGROUND"",""date"":""2024-10-01""}]"
    }
    $awids["a7"] = $aw.id; log "  $($aw.id)"
  } catch { Write-Host "  Error: $_" -ForegroundColor Red }
}

# -- Auctions ----------------------------------------------
$aucids = @{}

if ($awids["a0"] -and $pids["yara"]) {
  try {
    $o = (Get-Date).AddHours(-2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $c = (Get-Date).AddHours(2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $auc = Post "auctions" @{ artwork_id=$awids["a0"]; seller_id=$pids["yara"]; reserve_gbp=3000; current_bid_gbp=4200; bid_count=9; opens_at=$o; closes_at=$c; status="live" }
    $aucids["a0"] = $auc.id; log "Auction: $($auc.id)"
  } catch { Write-Host "  Auction error: $_" -ForegroundColor Red }
}

if ($awids["a3"] -and $pids["yara"]) {
  try {
    $o = (Get-Date).AddHours(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $c = (Get-Date).AddHours(6).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $auc = Post "auctions" @{ artwork_id=$awids["a3"]; seller_id=$pids["yara"]; reserve_gbp=600; current_bid_gbp=730; bid_count=3; opens_at=$o; closes_at=$c; status="live" }
    $aucids["a3"] = $auc.id; log "Auction: $($auc.id)"
  } catch { Write-Host "  Auction error: $_" -ForegroundColor Red }
}

if ($awids["a6"] -and $pids["amara"]) {
  try {
    $o = (Get-Date).AddHours(-1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $c = (Get-Date).AddHours(3).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $auc = Post "auctions" @{ artwork_id=$awids["a6"]; seller_id=$pids["amara"]; reserve_gbp=900; current_bid_gbp=1200; bid_count=5; opens_at=$o; closes_at=$c; status="live" }
    $aucids["a6"] = $auc.id; log "Auction: $($auc.id)"
  } catch { Write-Host "  Auction error: $_" -ForegroundColor Red }
}

# -- Bids --------------------------------------------------
if ($aucids["a0"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-62).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a0"]; bidder_id=$pids["collector"]; amount_gbp=3200; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a0"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-45).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a0"]; bidder_id=$pids["collector"]; amount_gbp=3500; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a0"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-31).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a0"]; bidder_id=$pids["collector"]; amount_gbp=3700; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a0"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-14).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a0"]; bidder_id=$pids["collector"]; amount_gbp=4000; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a0"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a0"]; bidder_id=$pids["collector"]; amount_gbp=4200; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a3"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a3"]; bidder_id=$pids["collector"]; amount_gbp=650; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a3"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-10).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a3"]; bidder_id=$pids["collector"]; amount_gbp=730; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a6"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-45).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a6"]; bidder_id=$pids["collector"]; amount_gbp=950; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a6"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-20).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a6"]; bidder_id=$pids["collector"]; amount_gbp=1050; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}
if ($aucids["a6"] -and $pids["collector"]) {
  try {
    $t = (Get-Date).AddMinutes(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    Post "bids" @{ auction_id=$aucids["a6"]; bidder_id=$pids["collector"]; amount_gbp=1200; placed_at=$t; is_winning=$false } | Out-Null
  } catch { }
}

# -- Follows -----------------------------------------------
if ($pids["collector"] -and $pids["yara"]) { try { Post "follows" @{ follower_id=$pids["collector"]; following_id=$pids["yara"] } | Out-Null } catch { } }
if ($pids["collector"] -and $pids["kwame"]) { try { Post "follows" @{ follower_id=$pids["collector"]; following_id=$pids["kwame"] } | Out-Null } catch { } }
if ($pids["collector"] -and $pids["amara"]) { try { Post "follows" @{ follower_id=$pids["collector"]; following_id=$pids["amara"] } | Out-Null } catch { } }
if ($pids["curator"] -and $pids["yara"]) { try { Post "follows" @{ follower_id=$pids["curator"]; following_id=$pids["yara"] } | Out-Null } catch { } }
if ($pids["curator"] -and $pids["kwame"]) { try { Post "follows" @{ follower_id=$pids["curator"]; following_id=$pids["kwame"] } | Out-Null } catch { } }

# -- Exhibition --------------------------------------------
if ($pids["curator"]) {
  try {
    $exh = Post "exhibitions" @{
      curator_id=""+$pids["curator"]; title="Diaspora Voices - Group Show 2026"
      statement="A group exhibition exploring identity, belonging and diaspora experience."
      status="published"; visibility="public"
      opens_at="2026-06-12"; closes_at="2026-07-04"; auction_enabled=$true
    }
    log "Exhibition: $($exh.id)"
    $ord = 0
    foreach ($k in @("a0","a1","a4","a6")) {
      if ($awids[$k]) {
        Post "exhibition_works" @{ exhibition_id=$exh.id; artwork_id=$awids[$k]; display_order=$ord } | Out-Null
        $ord++
      }
    }
  } catch { Write-Host "Exhibition error: $_" -ForegroundColor Red }
}

Write-Host ""
Write-Host "Seed complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test accounts (password: Password123!):" -ForegroundColor White
Write-Host "  yara@artunderground.test" -ForegroundColor Gray
Write-Host "  kwame@artunderground.test" -ForegroundColor Gray
Write-Host "  amara@artunderground.test" -ForegroundColor Gray
Write-Host "  collector@artunderground.test" -ForegroundColor Gray
Write-Host "  curator@artunderground.test" -ForegroundColor Gray
Write-Host ""
Write-Host "Visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
