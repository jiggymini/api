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

import { callbackToClient } from '../../utils/callback';
import CustomError from '../../error/custom_error';
import logger from '../../logger';

import * as tendermintNdid from '../../tendermint/ndid';
import * as config from '../../config';
import * as db from '../../db';
import errorType from '../../error/type';
import { getErrorObjectForClient } from '../../error/helpers';

export async function registerOrUpdateASService(
  { service_id, reference_id, callback_url, min_ial, min_aal, url },
  { synchronous = false } = {}
) {
  try {
    //check already register?
    let registeredASList = await tendermintNdid.getAsNodesByServiceId({
      service_id,
    });
    let isRegisterd = false;
    registeredASList.forEach(({ node_id }) => {
      isRegisterd = isRegisterd || node_id === config.nodeId;
    });

    if (!isRegisterd) {
      if (!service_id || !min_aal || !min_ial || !url) {
        throw new CustomError({
          message: errorType.MISSING_ARGUMENTS.message,
          code: errorType.MISSING_ARGUMENTS.code,
          clientError: true,
        });
      }
    }

    if (synchronous) {
      await registerOrUpdateASServiceInternalAsync(...arguments, {
        isRegisterd,
      });
    } else {
      registerOrUpdateASServiceInternalAsync(...arguments, {
        isRegisterd,
      });
    }
  } catch (error) {
    throw new CustomError({
      message: 'Cannot register/update AS service',
      service_id,
      reference_id,
      callback_url,
      min_ial,
      min_aal,
      url,
      synchronous,
      cause: error,
    });
  }
}

async function registerOrUpdateASServiceInternalAsync(
  { service_id, reference_id, callback_url, min_ial, min_aal, url },
  { synchronous = false } = {},
  { isRegisterd }
) {
  try {
    const promises = [];
    if (!isRegisterd) {
      promises.push(
        tendermintNdid.registerServiceDestination({
          service_id,
          min_aal,
          min_ial,
          node_id: config.nodeId,
        })
      );
    } else {
      promises.push(
        tendermintNdid.updateServiceDestination({
          service_id,
          min_aal,
          min_ial,
        })
      );
    }
    if (url) {
      promises.push(db.setServiceCallbackUrl(service_id, url));
    }

    await Promise.all(promises);

    if (!synchronous) {
      await callbackToClient(
        callback_url,
        {
          type: 'add_or_update_service_result',
          success: true,
          reference_id,
        },
        true
      );
    }
  } catch (error) {
    logger.error({
      message: 'Upsert AS service internal async error',
      originalArgs: arguments[0],
      options: arguments[1],
      additionalArgs: arguments[2],
      error,
    });

    if (!synchronous) {
      await callbackToClient(
        callback_url,
        {
          type: 'add_or_update_service_result',
          success: false,
          reference_id,
          error: getErrorObjectForClient(error),
        },
        true
      );
    }

    throw error;
  }
}