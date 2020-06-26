/**
 * Copyright (c) 2018, 2019 National Digital ID COMPANY LIMITED
 *
 * This file is part of NDID software.
 *
 * NDID is the free software: you can redistribute it and/or modify it under
 * the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or any later
 * version.
 *
 * NDID is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Affero GNU General Public License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with the NDID source code. If not, see https://www.gnu.org/licenses/agpl.txt.
 *
 * Please contact info@ndid.co.th for any further questions
 *
 */
import GRPCTelemetryClient from './grpc';
import logger from '../logger';

export default class TelemetryClient {
  constructor({
    tokenManager,
  }) {
    this.tokenManager = tokenManager;

    // create new GRPCTelemetryClient
    this.client = new GRPCTelemetryClient();
  }

  async receiveRequestEventData(nodeId, events) {
    if (!events || events.length === 0) return; // no events

    const token = await this.tokenManager.getTokenFromNodeId(nodeId);
    if (token == undefined) {
      // no token for this nodeId
      // cannot send the data
      return false;
    }

    logger.info("Sending", events.length, "request events of ", nodeId);
    const result = await this.client.sendRequestEvents({
      nodeId,
      token,
      events,
    });

    // incase the operation is invalid, remove the token manager and try the operation again
    if (this.client.isTokenInvalid(result)) {
      logger.info("Invalidating token of node", nodeId, token);
      await this.tokenManager.invalidateToken(nodeId, token);
      return this.receiveRequestEventData(nodeId, events);
    }

    return this.client.isOk(result);
  }

};
