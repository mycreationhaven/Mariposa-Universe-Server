CREATE INDEX "player_sessions_user_idx" ON "player_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "player_sessions_expiry_idx" ON "player_sessions" USING btree ("expires_at");