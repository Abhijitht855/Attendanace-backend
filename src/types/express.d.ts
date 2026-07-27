import { IAdmin } from '../models/Admin';
import { IEmployee } from '../models/Employee';

declare global {
  namespace Express {
    interface Request {
      user?: IAdmin | IEmployee;
    }
  }
}